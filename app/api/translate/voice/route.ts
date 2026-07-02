import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import cloudinary from '@/lib/cloudinary';
import { translateVoiceSchema } from '@/lib/validation';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const ELEVENLABS_VOICE_ID = 'XB0fDUnXU5powFXDhCwa';

const LANGUAGE_TO_ELEVENLABS: Record<string, string> = {
  hi: 'hi',
  en: 'en',
  te: 'te',
  ta: 'ta',
  kn: 'kn',
  ml: 'ml',
  mr: 'mr',
  bn: 'bn',
  gu: 'gu',
  pa: 'pa',
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = translateVoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { adId, targetLang, text } = parsed.data;

    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 503 });
    }

    const voiceText = text || ad.transcript || '';
    if (!voiceText) {
      return NextResponse.json({ error: 'No text to synthesize' }, { status: 400 });
    }

    const ttsResponse = await fetch(`${ELEVENLABS_API_URL}/${ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: voiceText,
        model_id: 'eleven_multilingual_v2',
        language_code: LANGUAGE_TO_ELEVENLABS[targetLang] || targetLang,
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.5,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errBody = await ttsResponse.text();
      console.error('[voice-translate] ElevenLabs error:', ttsResponse.status, errBody);
      return NextResponse.json({ error: 'Voice generation failed' }, { status: 502 });
    }

    const ttsBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'voicecart/translations',
          format: 'mp3',
          public_id: `translated_${adId}_${targetLang}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string });
        }
      );
      uploadStream.end(ttsBuffer);
    });

    return NextResponse.json({ translatedAudioUrl: uploadResult.secure_url });
  } catch (error) {
    console.error('[voice-translate] Error:', error);
    return NextResponse.json({ error: 'Voice generation failed' }, { status: 500 });
  }
}
