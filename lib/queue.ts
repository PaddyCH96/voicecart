import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import cloudinary from '@/lib/cloudinary';

const HINDI_COPYWRITER_SYSTEM_PROMPT = `You are a Hindi copywriter for social commerce. Given a transcript of a seller describing their product, produce exactly this JSON:
{
  "instagram": "2-3 lines Instagram caption, friendly, with emojis, include price if mentioned, call to action",
  "whatsapp": "Short WhatsApp broadcast message, direct, with clear call to action (e.g., 'अभी ऑर्डर करें WhatsApp पर')",
  "hook": "1 line hook for Instagram Reel, attention-grabbing"
}

Rules:
- Use Devanagari script (Hindi)
- Avoid English words unless common (e.g., "sale", "discount", "order")
- Keep tone warm and conversational
- Include relevant emojis
- Output ONLY valid JSON, no markdown fences`;

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const ELEVENLABS_VOICE_ID = 'XB0fDUnXU5powFXDhCwa';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
};

export const adQueue = new Queue('ad-processing', { connection });
export const retryQueue = new Queue('ad-retry', { connection });

export async function addAdProcessingJob(adId: string, language: string) {
  await adQueue.add('process-ad', { adId, language }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

export async function addRetryJob(adId: string, language: string, attempt: number) {
  await retryQueue.add('retry-ad', { adId, language, attempt }, {
    delay: Math.pow(2, attempt) * 5000,
  });
}

async function processAdJob(job: Job<{ adId: string; language: string }>) {
  const { adId } = job.data;
  console.log(`[queue] Processing ad ${adId} (attempt ${job.attemptsMade + 1})`);

  try {
    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new Error('Ad not found');

    await prisma.adProcessingJob.updateMany({
      where: { adId, status: 'pending' },
      data: { status: 'processing' },
    });

    // Step 1: Transcribe
    console.log(`[queue] Transcribing ad ${adId}`);
    const audioResponse = await fetch(ad.inputAudioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'hi',
      response_format: 'text',
    });

    console.log(`[queue] Transcription: ${transcription.substring(0, 100)}...`);

    // Step 2: Generate marketing text
    console.log(`[queue] Generating marketing text...`);
    const textCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: HINDI_COPYWRITER_SYSTEM_PROMPT },
        { role: 'user', content: `Transcript:\n${transcription}` },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const generatedText = JSON.parse(textCompletion.choices[0]?.message?.content || '{}');
    console.log(`[queue] Generated text:`, generatedText);

    // Step 3: Generate TTS
    console.log(`[queue] Generating TTS...`);
    let outputAudioUrl = ad.inputAudioUrl;

    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const ttsResponse = await fetch(`${ELEVENLABS_API_URL}/${ELEVENLABS_VOICE_ID}`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: transcription,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.75, similarity_boost: 0.75, style: 0.5 },
          }),
        });

        if (ttsResponse.ok) {
          const ttsBuffer = Buffer.from(await ttsResponse.arrayBuffer());
          const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { resource_type: 'video', folder: 'voicecart/processed', format: 'mp3' },
              (error, result) => error ? reject(error) : resolve(result as { secure_url: string })
            );
            uploadStream.end(ttsBuffer);
          });
          outputAudioUrl = uploadResult.secure_url;
          console.log(`[queue] TTS uploaded: ${outputAudioUrl}`);
        } else {
          console.warn(`[queue] ElevenLabs TTS failed: ${ttsResponse.status}`);
        }
      } catch (ttsError) {
        console.warn('[queue] TTS generation failed:', ttsError);
      }
    }

    // Step 4: Update ad
    await prisma.ad.update({
      where: { id: adId },
      data: { transcript: transcription, generatedText, outputAudioUrl, status: 'completed' },
    });

    console.log(`[queue] Ad ${adId} completed`);
    return { status: 'completed' };
  } catch (error) {
    console.error(`[queue] Error processing ad ${adId}:`, error);

    if (job.attemptsMade < (job.opts.attempts || 3) - 1) {
      throw error; // BullMQ will retry with backoff
    } else {
      await prisma.ad.update({ where: { id: adId }, data: { status: 'failed' } }).catch(console.error);
      throw error;
    }
  }
}

async function processRetryJob(job: Job<{ adId: string; language: string; attempt: number }>) {
  const { adId, language } = job.data;
  console.log(`[retry-queue] Retrying ad ${adId} (attempt ${job.data.attempt})`);
  
  await prisma.adProcessingJob.updateMany({
    where: { adId, status: 'pending' },
    data: { status: 'processing' },
  });

  await addAdProcessingJob(adId, language);
}

export function startQueueWorkers() {
  const worker = new Worker('ad-processing', processAdJob, { connection, concurrency: 2 });
  const retryWorker = new Worker('ad-retry', processRetryJob, { connection });

  worker.on('completed', (job) => console.log(`[worker] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err?.message));
  retryWorker.on('completed', (job) => console.log(`[retry-worker] Job ${job.id} completed`));

  return { worker, retryWorker };
}