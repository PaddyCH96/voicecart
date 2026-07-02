import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { verifyPaymentSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_stub',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_stub',
});

const CREDIT_PRICE_PAISE = 4900; // ₹49 per credit

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await rateLimit(`verify-payment:${session.id}`, { maxRequests: 20, windowSeconds: 3600 });
    if (blocked) return blocked;

    const rawBody = await req.json();
    const parsed = verifyPaymentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = parsed.data;

    // Verify Razorpay signature
    const signatureBody = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(signatureBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature))) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Fetch the actual order from Razorpay to validate amount
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const orderAmount = Number(order.amount);
    const credits = Math.floor(orderAmount / CREDIT_PRICE_PAISE);
    if (credits < 1) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // Create credit purchase record and update balance in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.creditPurchase.create({
        data: {
          userId: session.id,
          amount: credits,
          pricePaid: orderAmount,
          razorpayPaymentId: razorpay_payment_id,
        },
      });

      return tx.user.update({
        where: { id: session.id },
        data: { creditsBalance: { increment: credits } },
      });
    });

    return NextResponse.json({
      success: true,
      creditsBalance: updatedUser.creditsBalance,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}
