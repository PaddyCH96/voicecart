'use client';

import { useState, useCallback } from 'react';

interface Props { adId: string; onClose: () => void; onSuccess: () => void; }
type Step = 'phone' | 'otp' | 'payment';

export default function PaymentModal({ adId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consumeCredit = useCallback(async (uid: string) => {
    const r = await fetch('/api/consume-credit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, adId }) });
    if (!r.ok) throw new Error();
    onSuccess();
  }, [adId, onSuccess]);

  const sendOtp = useCallback(async () => {
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) { setError('Valid 10-digit number required'); return; }
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setStep('otp');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setLoading(false); }
  }, [phone]);

  const verifyOtp = useCallback(async () => {
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setUserId(d.userId); setCreditsBalance(d.creditsBalance);
      if (d.creditsBalance > 0) await consumeCredit(d.userId); else setStep('payment');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setLoading(false); }
  }, [phone, otp, consumeCredit]);

  const pay = useCallback(async () => {
    if (!userId) return;
    setLoading(true); setError(null);
    try {
      const or = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, amount: 1 }) });
      const od = await or.json(); if (!or.ok) throw new Error(od.error);
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) throw new Error('Payment not configured');

      const opts = {
        key, amount: od.amount, currency: od.currency, name: 'VoiceCart', description: '1 Audio Ad', order_id: od.razorpayOrderId,
        prefill: { contact: `+91${phone}` }, theme: { color: '#0A0A0A' },
        handler: async (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const vr = await fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...res, userId, credits: 1 }) });
          if (!vr.ok) throw new Error(); await consumeCredit(userId);
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      if (!(window as unknown as Record<string, unknown>).Razorpay) {
        await new Promise<void>((ok, no) => {
          const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => ok(); s.onerror = () => no(new Error()); document.head.appendChild(s);
        });
      }
      const rzp = new (window as unknown as Record<string, new (o: unknown) => { open: () => void }>).Razorpay(opts);
      rzp.open();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setLoading(false); }
  }, [userId, phone, consumeCredit]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[6px] a-fade" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-[20px] sm:rounded-[20px] p-6 pb-9 a-sheet">
        {/* Handle */}
        <div className="w-8 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5 sm:hidden" />

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#FAFAFA] transition-colors">
          <svg width="13" height="13" fill="none" stroke="#A3A3A3" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {/* Phone */}
        {step === 'phone' && (
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] mb-0.5">Phone number</h2>
            <p className="text-[12px] text-[#A3A3A3] mb-5">We&apos;ll send an OTP</p>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-2.5 rounded-[10px] bg-[#FAFAFA] text-[14px] text-[#525252] font-medium border border-[#F0F0F0]">+91</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210" autoFocus
                className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-[15px] tabular-nums placeholder:text-[#D4D4D4]" />
            </div>
            {error && <p className="text-[12px] text-[#DC2626] mb-3">{error}</p>}
            <button onClick={sendOtp} disabled={loading || phone.length !== 10} className="btn-primary">
              {loading ? <span className="dot-loading"><span /><span /><span /></span> : 'Send OTP'}
            </button>
          </div>
        )}

        {/* OTP */}
        {step === 'otp' && (
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] mb-0.5">Enter OTP</h2>
            <p className="text-[12px] text-[#A3A3A3] mb-5">
              Sent to +91 {phone}
              <button onClick={() => setStep('phone')} className="text-[#E8590C] ml-1.5 font-medium">Change</button>
            </p>
            <input type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" autoFocus
              className="w-full px-3.5 py-3 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-center text-[22px] tracking-[0.35em] tabular-nums placeholder:text-[#E5E5E5] mb-4" />
            {error && <p className="text-[12px] text-[#DC2626] mb-3">{error}</p>}
            <button onClick={verifyOtp} disabled={loading || otp.length !== 6} className="btn-primary">
              {loading ? <span className="dot-loading"><span /><span /><span /></span> : 'Verify'}
            </button>
          </div>
        )}

        {/* Payment */}
        {step === 'payment' && (
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] mb-0.5">Payment</h2>
            <p className="text-[12px] text-[#A3A3A3] mb-5">Quick UPI checkout</p>

            <div className="card p-3.5 mb-5 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium">1 Audio Ad</p>
                <p className="text-[11px] text-[#A3A3A3]">Pro audio + captions</p>
              </div>
              <span className="text-[18px] font-semibold tracking-[-0.02em]">₹49</span>
            </div>

            {creditsBalance > 0 && (
              <button onClick={() => userId && consumeCredit(userId)} className="w-full py-3 rounded-[14px] bg-[#16A34A] text-white text-[14px] font-medium mb-3 active:scale-[0.98] transition-all">
                Use credit ({creditsBalance} left)
              </button>
            )}

            {error && <p className="text-[12px] text-[#DC2626] mb-3">{error}</p>}
            <button onClick={pay} disabled={loading} className="btn-primary">
              {loading ? <span className="dot-loading"><span /><span /><span /></span> : 'Pay ₹49 via UPI'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
