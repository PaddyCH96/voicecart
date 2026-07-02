import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import cloudinary from '@/lib/cloudinary';
import { getSession } from '@/lib/auth';
import { uploadAudioSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { addAdProcessingJob } from '@/lib/queue';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const AUDIO_MAGIC_BYTES: Uint8Array[] = [
  new Uint8Array([0xFF, 0xFB]),           // MP3
  new Uint8Array([0x49, 0x44, 0x33]),      // ID3 (MP3 with tags)
  new Uint8Array([0x52, 0x49, 0x46, 0x46]), // WAV/RIFF
  new Uint8Array([0x4F, 0x67, 0x67, 0x53]), // OGG
  new Uint8Array([0x1A, 0x45, 0xDF, 0xA3]), // WebM
  new Uint8Array([0x00, 0x00, 0x00]),       // MP4/M4A
];

function isValidAudioContent(buffer: Uint8Array): boolean {
  return AUDIO_MAGIC_BYTES.some(sig => {
    if (buffer.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) if (buffer[i] !== sig[i]) return false;
    return true;
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await rateLimit(`upload:${session.id}`, { maxRequests: 20, windowSeconds: 3600 });
    if (blocked) return blocked;

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const languageRaw = formData.get('language') as string || 'hi';
    const langParsed = uploadAudioSchema.safeParse({ language: languageRaw });
    const language = langParsed.success ? langParsed.data.language : 'hi';

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!isValidAudioContent(new Uint8Array(bytes))) {
      return NextResponse.json({ error: 'File content does not match a supported audio format' }, { status: 400 });
    }

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'voicecart/raw', format: 'webm' },
        (error, result) => error ? reject(error) : resolve(result as { secure_url: string })
      );
      uploadStream.end(buffer);
    });

    const ad = await prisma.ad.create({
      data: { inputAudioUrl: uploadResult.secure_url, status: 'processing' },
    });

    await prisma.adProcessingJob.create({
      data: { adId: ad.id, language, status: 'pending', maxRetries: 3 },
    });

    await addAdProcessingJob(ad.id, language);

    return NextResponse.json({ adId: ad.id });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}