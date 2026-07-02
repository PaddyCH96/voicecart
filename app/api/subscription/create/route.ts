import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getSession } from '@/lib/auth';
import { subscriptionCreateSchema } from '@/lib/validation';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_stub',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_stub',
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = subscriptionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Create a real Razorpay subscription (recurring billing)
    // In production, use a plan_id created from the Razorpay Dashboard:
    //   const subscription = await razorpay.subscriptions.create({
    //     plan_id: 'plan_YourPlanIdFromDashboard',
    //     customer_notify: 1,
    //     total_count: 12,
    //     notes: { userId: session.id }
    //   });
    //
    // For testing without a Dashboard plan_id, create subscription with period:
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PRO_PLAN_ID || 'plan_stub',
      customer_notify: 1,
      total_count: 12, // 12 months
      notes: { userId: session.id },
    });

    return NextResponse.json({ 
      subscriptionId: subscription.id,
      amount: 49900,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_stub'
    });
  } catch (error) {
    console.error('Razorpay subscription error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
