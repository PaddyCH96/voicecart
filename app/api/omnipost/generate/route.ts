import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { openai } from '@/lib/openai';
import { omnipostSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

const SYSTEM_PROMPT = `You are a multilingual social commerce content creator. Given a Hindi transcript of a seller describing their product, generate platform-optimized marketing copy for 10 platforms.

For each platform, follow these rules:
- Use the target language specified (Hindi if no language given, or the requested Indian language)
- Include relevant emojis
- Keep within platform character limits
- Include a clear call to action
- Use warm, conversational tone

Return a JSON object with exactly these 10 keys, each containing a "content" string:
{
  "Instagram": "2-3 line caption with emojis, hashtags, CTA (max 2200 chars)",
  "WhatsApp": "Direct broadcast message with clear CTA, use *bold* for emphasis (max 1000 chars)",
  "X": "Concise tweet with hashtags (max 280 chars)",
  "X Thread": "3-part thread with hook, body, and CTA (each part under 280 chars, separated by newlines)",
  "Facebook": "Engaging community post asking for comments (max 2000 chars)",
  "YouTube": "Video description with hook, body, chapters, CTA, and subscribe reminder",
  "LinkedIn": "Professional tone post about business impact with industry hashtags (max 3000 chars)",
  "Reels Hook": "Single attention-grabbing line optimized for Reels/Shorts (under 100 chars)",
  "Pinterest": "Pin description with keywords and save CTA (max 500 chars)",
  "Email": "Complete promotional email with subject line, greeting, body, and signature"
}

Output ONLY valid JSON, no markdown fences, no additional text.`;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await rateLimit(`omnipost:${session.id}`, { maxRequests: 20, windowSeconds: 3600 });
    if (blocked) return blocked;

    const body = await req.json();
    const parsed = omnipostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { transcript, language } = parsed.data;

    const languageInstruction = language !== 'hi'
      ? `Translate all content to the language code "${language}" (use appropriate script for that language).`
      : 'Generate content in Hindi (Devanagari script).';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: languageInstruction },
        { role: 'user', content: `Transcript:\n${transcript}` },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    const platforms = JSON.parse(raw);

    const PLATFORM_ICONS: Record<string, string> = {
      Instagram: '📸',
      WhatsApp: '💬',
      X: '🐦',
      'X Thread': '🧵',
      Facebook: '👥',
      YouTube: '▶️',
      LinkedIn: '💼',
      'Reels Hook': '📱',
      Pinterest: '📌',
      Email: '📧',
    };

    const outputs = Object.entries(platforms).map(([platform, content]) => ({
      platform,
      icon: PLATFORM_ICONS[platform] || '📝',
      content: String(content),
      charCount: String(content).length,
    }));

    return NextResponse.json({ outputs });
  } catch (error) {
    console.error('[omnipost] Error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
