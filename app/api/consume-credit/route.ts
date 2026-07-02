import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireCsrf } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { consumeCreditSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    const blocked = await rateLimit(`consume-credit:${session.id}`, { maxRequests: 20, windowSeconds: 3600 });
    if (blocked) return blocked;

    const body = await req.json();
    const parsed = consumeCreditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { adId, idempotencyKey } = parsed.data;

    const userId = session.id;

    // Idempotency: skip if already processed
    if (idempotencyKey) {
      const dedupKey = `idempotent:consume-credit:${idempotencyKey}`;
      const existing = await redis.get(dedupKey);
      if (existing) {
        return NextResponse.json({ success: true, creditsBalance: Number(existing), idempotent: true });
      }
    }

    // Check ad exists and is completed
    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    if (ad.status !== 'completed') {
      return NextResponse.json({ error: 'Ad not yet processed' }, { status: 400 });
    }

    // Check ad is not already claimed by another user
    if (ad.userId && ad.userId !== userId) {
      return NextResponse.json({ error: 'Ad already claimed by another user' }, { status: 403 });
    }

    // Atomic: check credits AND update in single transaction with row-level locking
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Lock and check user credits atomically
      const user = await tx.user.findUnique({ 
        where: { id: userId },
        select: { creditsBalance: true }
      });
      if (!user) throw new Error('User not found');
      if (user.creditsBalance <= 0) throw new Error('Insufficient credits');

      // Update ad and decrement credits atomically
      await tx.ad.update({ where: { id: adId }, data: { userId } });
      return tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { decrement: 1 } },
      });
    });

    // Store idempotency marker
    const ik = parsed.data.idempotencyKey;
    if (ik) {
      const dedupKey = `idempotent:consume-credit:${ik}`;
      await redis.set(dedupKey, updatedUser.creditsBalance, { ex: 86400 });
    }

    return NextResponse.json({ success: true, creditsBalance: updatedUser.creditsBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to consume credit';
    if (message === 'Insufficient credits') {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }
    if (message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.error('Consume credit error:', error);
    return NextResponse.json({ error: 'Failed to consume credit' }, { status: 500 });
  }
}
