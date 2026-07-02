import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { verifyOtpSchema } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { phone, otp } = parsed.data;

    const blocked = await rateLimit(`verify-otp:${getClientIp(req)}`, { maxRequests: 10, windowSeconds: 300 });
    if (blocked) return blocked;

    // Verify OTP from Redis
    const storedOtp = await redis.get(`otp:${phone}`);

    if (!storedOtp || storedOtp !== otp) {
      return NextResponse.json({ error: 'गलत OTP। कृपया पुनः प्रयास करें।' }, { status: 400 });
    }

    // Delete the used OTP
    await redis.del(`otp:${phone}`);

    let user = await prisma.user.findUnique({
      where: { phone },
      include: { subscription: true, ads: true } // Include ads to check length
    });

    // First ad free per number
    if (!user || user.ads.length === 0) {
      if (!user) {
        user = await prisma.user.create({
          data: { phone, creditsBalance: 1 },
          include: { subscription: true, ads: true }
        });
      } else if (user.creditsBalance === 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { creditsBalance: 1 },
          include: { subscription: true, ads: true }
        });
      }
    }

    const token = await signToken({
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      plan: user.subscription?.plan || 'free'
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      userId: user.id,
      creditsBalance: user.creditsBalance
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
