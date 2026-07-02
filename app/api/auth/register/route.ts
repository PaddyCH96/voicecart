import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, setAuthCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, email, phone, password } = parsed.data;

    const blocked = await rateLimit(`register:${getClientIp(req)}`, { maxRequests: 3, windowSeconds: 3600 });
    if (blocked) return blocked;

    // Check existing
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    if (phone) {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) return NextResponse.json({ error: 'Phone already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email || undefined,
        phone: phone || undefined,
        passwordHash,
        creditsBalance: 1, // First ad free
      },
      include: { subscription: true }
    });

    const token = await signToken({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      plan: user.subscription?.plan || 'free'
    });
    
    await setAuthCookie(token);

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
