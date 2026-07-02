import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { openai } from '@/lib/openai';
import { translateTextSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

const TRANSLATION_PROMPT = (text: string, lang: string) =>
  `Translate the following Hindi text to ${lang}. Preserve all emojis and formatting. Output ONLY the translated text, nothing else.\n\n${text}`;

const SUPPORTED_LANGUAGES: Record<string, string> = {
  hi: 'Hindi',
  en: 'English',
  te: 'Telugu',
  ta: 'Tamil',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
  pa: 'Punjabi',
  or: 'Odia',
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await rateLimit(`translate-text:${session.id}`, { maxRequests: 20, windowSeconds: 3600 });
    if (blocked) return blocked;

    const body = await req.json();
    const parsed = translateTextSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { text, targetLang } = parsed.data;

    const langName = SUPPORTED_LANGUAGES[targetLang];
    if (!langName) {
      return NextResponse.json({ error: `Unsupported language: ${targetLang}` }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional translator. Translate accurately while preserving tone, emojis, and formatting.' },
        { role: 'user', content: TRANSLATION_PROMPT(text, langName) },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const translatedText = completion.choices[0]?.message?.content?.trim() || text;

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
