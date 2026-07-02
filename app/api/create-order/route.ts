import { NextRequest, NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { getSession } from '@/lib/auth';
import { createOrderSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

const PRICE_PER_CREDIT_PAISE = 4900; // ₹49

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await rateLimit(`create-order:${session.id}`, { maxRequests: 10, windowSeconds: 3600 });
    if (blocked) return blocked;

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    const credits = parsed.success ? parsed.data.amount : 1;

    const order = await razorpay.orders.create({
      amount: PRICE_PER_CREDIT_PAISE * credits,
      currency: 'INR',
      notes: {
        userId: session.id,
        credits: credits.toString(),
      },
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
