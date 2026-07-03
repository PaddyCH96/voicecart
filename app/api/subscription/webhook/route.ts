import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyText)
      .digest('hex');

    if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    // Deduplicate webhook events via idempotency key
    const eventId = event.id || `${event.event}_${event.payload?.payment?.entity?.id || Date.now()}`;
    const dedupKey = `webhook:${eventId}`;
    const alreadyProcessed = await redis.get(dedupKey);
    if (alreadyProcessed) {
      return NextResponse.json({ status: 'ok', deduplicated: true });
    }
    // SECURITY FIX: Reduced TTL from 3600s (1hr) to 300s (5min) to prevent replay attacks
    await redis.set(dedupKey, '1', { ex: 300 });

    if (event.event === 'subscription.charged' || event.event === 'subscription.completed') {
      const payment = event.payload?.payment?.entity;
      const subscription = event.payload?.subscription?.entity;

      const userId = subscription?.notes?.userId || payment?.notes?.userId;

      if (userId) {
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan: 'pro',
            status: 'active',
            razorpaySubscriptionId: subscription?.id || null,
            currentPeriodStart: new Date(subscription?.current_start * 1000 || Date.now()),
            currentPeriodEnd: new Date(subscription?.current_end * 1000 || Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          update: {
            plan: 'pro',
            status: 'active',
            razorpaySubscriptionId: subscription?.id || undefined,
            currentPeriodEnd: new Date(subscription?.current_end * 1000 || Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // Handle subscription cancellation
    if (event.event === 'subscription.cancelled') {
      const subscription = event.payload?.subscription?.entity;
      const userId = subscription?.notes?.userId;

      if (userId) {
        await prisma.subscription.updateMany({
          where: { userId },
          data: { status: 'cancelled' },
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
