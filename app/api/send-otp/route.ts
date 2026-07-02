import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { otpSchema } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = otpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { phone } = parsed.data;

    const blocked = await rateLimit(`otp:${getClientIp(req)}`, { maxRequests: 5, windowSeconds: 300 });
    if (blocked) return blocked;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with 5 minute TTL
    await redis.set(`otp:${phone}`, otp, { ex: 300 });

    // Track OTP sends per phone (max 3 per hour)
    const rateKey = `otp_rate:${phone}`;
    const attempts = (await redis.get<number>(rateKey)) || 0;
    if (attempts < 3) {
      await redis.set(rateKey, attempts + 1, { ex: 3600 });
    }

    // Send via MSG91
    if (process.env.MSG91_AUTH_KEY) {
      try {
        await fetch('https://control.msg91.com/api/v5/otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authkey': process.env.MSG91_AUTH_KEY!,
          },
          body: JSON.stringify({
            template_id: process.env.MSG91_TEMPLATE_ID,
            mobile: `91${phone}`,
            otp,
          }),
        });
      } catch (smsError) {
        console.error('MSG91 SMS error:', smsError);
        // Don't fail the request - OTP is still in Redis for dev testing
      }
    } else {
      // Dev mode: log OTP to console
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
