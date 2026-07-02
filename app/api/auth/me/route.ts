import { NextRequest, NextResponse } from 'next/server';
import { getSession, signToken, setAuthCookie, deleteAuthCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { profileUpdateSchema } from '@/lib/validation';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user: session });
  } catch {
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, email } = parsed.data;

    const updateData: Record<string, string> = {};
    if (name?.trim()) updateData.name = name.trim();
    if (email?.trim()) {
      // Use transaction to prevent race condition on email uniqueness
      const existing = await prisma.$transaction(async (tx) => {
        return tx.user.findUnique({ where: { email: email.trim() } });
      });
      if (existing && existing.id !== session.id) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
      updateData.email = email.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
    });

    const subscription = await prisma.subscription.findUnique({ where: { userId: session.id } });
    const newToken = await signToken({
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      plan: subscription?.plan || 'free',
    });
    await setAuthCookie(newToken);

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, plan: subscription?.plan || 'free' } });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user data in order (respecting foreign keys)
    await prisma.$transaction([
      prisma.creditPurchase.deleteMany({ where: { userId: session.id } }),
      prisma.subscription.deleteMany({ where: { userId: session.id } }),
      prisma.asset.deleteMany({ where: { userId: session.id } }),
      prisma.project.deleteMany({ where: { userId: session.id } }),
      prisma.ad.deleteMany({ where: { userId: session.id } }),
      prisma.user.delete({ where: { id: session.id } }),
    ]);

    await deleteAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
