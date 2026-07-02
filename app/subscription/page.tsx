'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Check, Star, Zap } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

interface RazorpayOptions {
  key: string;
  subscription_id?: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  order_id?: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  razorpay_subscription_id?: string;
}

interface RazorpayInstance {
  open(): void;
  close(): void;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 1. Fetch Order ID from API
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 2. Load Razorpay script programmatically
      const loadScript = () => new Promise<boolean>(resolve => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      const isLoaded = await loadScript();
      if (!isLoaded) throw new Error('Razorpay load failed');

      // 3. Open Razorpay subscription checkout
      const options = {
        key: data.key,
        subscription_id: data.subscriptionId,
        name: 'VoiceCart Creator Studio',
        description: 'Pro Subscription - ₹499/mo',
        handler: () => {
          setLoading(false);
          router.push('/dashboard?upgraded=true');
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: { color: '#0A0A0A' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (e) {
      alert(e instanceof Error ? e.message : 'Subscription failed');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-12 max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] mb-2 text-center dark:text-white a-enter">Pick your plan</h1>
        <p className="text-[14px] text-[#A3A3A3] mb-12 text-center max-w-md a-enter-1">Start making simple AI audio ads for free. Scale to engaging platform-ready video formats with Pro.</p>

        <div className="flex flex-col md:flex-row gap-6 w-full justify-center max-w-3xl a-enter-2">
          {/* Free Tier */}
          <div className="flex-1 card p-8 flex flex-col justify-between">
            <div>
              <p className="text-[18px] font-semibold dark:text-white mb-1">Free</p>
              <p className="text-[13px] text-[#A3A3A3] mb-6">For casual creators.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-[32px] font-bold tracking-[-0.04em] dark:text-white">₹0</span>
                <span className="text-[13px] text-[#A3A3A3]">/ forever</span>
              </div>

              <ul className="flex flex-col gap-4 mb-8">
                <li className="flex gap-3 text-[13px] dark:text-white items-start"><Check size={16} className="text-[#A3A3A3] shrink-0 mt-0.5" /> 5 Audio or Video Projects</li>
                <li className="flex gap-3 text-[13px] dark:text-white items-start"><Check size={16} className="text-[#A3A3A3] shrink-0 mt-0.5" /> Watermarked video output</li>
                <li className="flex gap-3 text-[13px] dark:text-white items-start"><Check size={16} className="text-[#A3A3A3] shrink-0 mt-0.5" /> Access to stub assets</li>
                <li className="flex gap-3 text-[13px] text-[#A3A3A3] items-start opacity-50"><XIcon /> Pay per additional Audio Ad (₹49)</li>
              </ul>
            </div>
            
            <button className="btn-ghost w-full" disabled>Current Plan</button>
          </div>

          {/* Pro Tier */}
          <div className="flex-1 rounded-[16px] p-8 border-[2px] border-[#0A0A0A] dark:border-white relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute top-0 right-0 bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-bl-[12px] flex items-center gap-1">
              <Star size={10} fill="currentColor" /> Recommended
            </div>

            <div className="relative z-10">
              <p className="text-[18px] font-semibold dark:text-white mb-1 flex items-center gap-2">Pro <Zap size={16} className="text-[#E8590C]" fill="currentColor" /></p>
              <p className="text-[13px] text-[#A3A3A3] mb-6">Unlimited creation & export.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-[32px] font-bold tracking-[-0.04em] dark:text-white">₹499</span>
                <span className="text-[13px] text-[#A3A3A3]">/ month</span>
              </div>

              <ul className="flex flex-col gap-4 mb-8">
                <li className="flex gap-3 text-[13px] dark:text-white items-start font-medium"><Check size={16} className="text-[#0A0A0A] dark:text-white shrink-0 mt-0.5" /> Unlimited Video & Audio Projects</li>
                <li className="flex gap-3 text-[13px] dark:text-white items-start font-medium"><Check size={16} className="text-[#0A0A0A] dark:text-white shrink-0 mt-0.5" /> 1080p Export with NO watermark</li>
                <li className="flex gap-3 text-[13px] dark:text-white items-start font-medium"><Check size={16} className="text-[#0A0A0A] dark:text-white shrink-0 mt-0.5" /> Multi-language Auto-Translation</li>
                <li className="flex gap-3 text-[13px] dark:text-white items-start font-medium"><Check size={16} className="text-[#0A0A0A] dark:text-white shrink-0 mt-0.5" /> Premium Music Library</li>
              </ul>
            </div>
            
            <button onClick={handleSubscribe} disabled={loading || user?.plan === 'pro'} className="btn-primary w-full shadow-lg relative z-10">
              {loading ? 'Please wait...' : user?.plan === 'pro' ? 'Already Pro' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
