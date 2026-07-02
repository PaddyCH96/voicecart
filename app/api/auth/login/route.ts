import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, setAuthCookie, deleteAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const blocked = await rateLimit(`login:${getClientIp(req)}`, { maxRequests: 5, windowSeconds: 300 });
    if (blocked) return blocked;

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { subscription: true }
    });
    
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await deleteAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
