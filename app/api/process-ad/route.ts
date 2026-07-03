import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import cloudinary from '@/lib/cloudinary';
import { requireCronAuth } from '@/lib/auth';
import { processAdSchema } from '@/lib/validation';

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
// Rachel voice (good for Hindi) - can be changed to any Hindi voice ID
const ELEVENLABS_VOICE_ID = 'XB0fDUnXU5powFXDhCwa'; // Charlotte - good clarity

export async function POST(req: NextRequest) {
  const authError = await requireCronAuth(req);
  if (authError) return authError;

  let adId: string | undefined;
  
  try {
    const body = await req.json();
    const parsed = processAdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    adId = parsed.data.adId;

    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    // Update job status to processing
    await prisma.adProcessingJob.updateMany({
      where: { adId, status: 'pending' },
      data: { status: 'processing' },
    });

    // Step 1: Transcribe audio using OpenAI Whisper
    console.log(`[process-ad] Starting transcription for ad ${adId}`);
    const audioResponse = await fetch(ad.inputAudioUrl);
    if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'hi',
      response_format: 'text',
    });

    console.log(`[process-ad] Transcription: ${transcription.substring(0, 100)}...`);

    // Step 2: Generate marketing text using GPT-4o-mini
    console.log(`[process-ad] Generating marketing text...`);
    const textCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: HINDI_COPYWRITER_SYSTEM_PROMPT },
        { role: 'user', content: `Transcript:\n${transcription}` },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const rawContent = textCompletion.choices[0]?.message?.content;
    if (!rawContent) throw new Error('Empty response from AI');
    const generatedText = JSON.parse(rawContent);
    if (!generatedText || typeof generatedText !== 'object') throw new Error('Invalid JSON structure from AI');
    console.log(`[process-ad] Generated text:`, generatedText);

    // Step 3: Generate clean voiceover using ElevenLabs TTS
    // Uses the original transcript as the TTS input (no separate script generation needed)
    console.log(`[process-ad] Generating TTS voiceover...`);
    let outputAudioUrl = ad.inputAudioUrl; // fallback to original

    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const adScript = transcription;

        const ttsResponse = await fetch(`${ELEVENLABS_API_URL}/${ELEVENLABS_VOICE_ID}`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: adScript,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.75,
              style: 0.5,
            },
          }),
        });

        if (ttsResponse.ok) {
          const ttsBuffer = Buffer.from(await ttsResponse.arrayBuffer());

          // Upload TTS audio to Cloudinary
          const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'video',
                folder: 'voicecart/processed',
                format: 'mp3',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result as { secure_url: string });
              }
            );
            uploadStream.end(ttsBuffer);
          });

          outputAudioUrl = uploadResult.secure_url;
          console.log(`[process-ad] TTS audio uploaded: ${outputAudioUrl}`);
        } else {
          console.warn(`[process-ad] ElevenLabs TTS failed: ${ttsResponse.status}`);
        }
      } catch (ttsError) {
        console.warn('[process-ad] TTS generation failed, using original audio:', ttsError);
      }
    } else {
      console.warn('[process-ad] No ELEVENLABS_API_KEY, skipping TTS');
    }

    // Step 4: Update ad record
    await prisma.ad.update({
      where: { id: adId },
      data: {
        transcript: transcription,
        generatedText,
        outputAudioUrl,
        status: 'completed',
      },
    });

    console.log(`[process-ad] Ad ${adId} processing completed`);
    return NextResponse.json({ status: 'completed' });
  } catch (error) {
    console.error(`[process-ad] Error processing ad ${adId}:`, error);

    if (adId) {
      const job = await prisma.adProcessingJob.findFirst({
        where: { adId },
        orderBy: { createdAt: 'desc' },
      });

      if (job && job.retryCount < job.maxRetries) {
        const delay = Math.pow(2, job.retryCount) * 5000; // 5s, 10s, 20s backoff
        await prisma.adProcessingJob.update({
          where: { id: job.id },
          data: {
            status: 'pending',
            retryCount: { increment: 1 },
            nextRetryAt: new Date(Date.now() + delay),
            lastError: String(error),
          },
        });
      } else {
        await prisma.ad.update({
          where: { id: adId },
          data: { status: 'failed' },
        }).catch(console.error);

        if (job) {
          await prisma.adProcessingJob.update({
            where: { id: job.id },
            data: { status: 'failed', lastError: String(error) },
          }).catch(console.error);
        }
      }
    }

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
