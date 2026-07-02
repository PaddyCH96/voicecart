'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tab = 'phone' | 'email';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (phone.length !== 10) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOtpSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  };

  const handlePhoneLogin = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      router.push('/dashboard');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false); }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      router.push('/dashboard');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false); }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
  ];

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 a-enter">
          <div className="w-7 h-7 rounded-[8px] bg-[#0A0A0A] flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="text-[15px] font-medium tracking-[-0.02em]">VoiceCart</span>
        </div>

        <h1 className="text-[24px] font-semibold tracking-[-0.03em] mb-1 a-enter-1">Welcome back</h1>
        <p className="text-[13px] text-[#A3A3A3] mb-7 a-enter-1">Sign in to your account</p>

        <div className="flex gap-1 p-1 rounded-[10px] bg-[#F5F5F5] mb-6 a-enter-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(null); }}
              className={`flex-1 py-2 text-[12px] font-medium rounded-[8px] transition-all ${
                tab === t.key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#A3A3A3]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'phone' && (
          <div className="a-scale">
            {!otpSent ? (
              <>
                <div className="flex gap-2 mb-4">
                  <span className="px-3 py-2.5 rounded-[10px] bg-[#FAFAFA] text-[14px] text-[#525252] font-medium border border-[#F0F0F0]">+91</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Phone number" autoFocus
                    className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-[15px] tabular-nums placeholder:text-[#D4D4D4]" />
                </div>
                <button onClick={handleSendOtp} disabled={loading || phone.length !== 10} className="btn-primary">
                  {loading ? '...' : 'Send OTP'}
                </button>
              </>
            ) : (
              <>
                <p className="text-[12px] text-[#A3A3A3] mb-3">OTP sent to +91 {phone}</p>
                <input type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP" autoFocus
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-center text-[18px] tracking-[0.3em] tabular-nums placeholder:text-[#D4D4D4] placeholder:tracking-normal placeholder:text-[14px] mb-4" />
                <button onClick={handlePhoneLogin} disabled={loading || otp.length !== 6} className="btn-primary">
                  {loading ? '...' : 'Verify & Sign In'}
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'email' && (
          <div className="flex flex-col gap-3 a-scale">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-[15px] placeholder:text-[#D4D4D4]" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-[15px] placeholder:text-[#D4D4D4]" />
            <button onClick={handleEmailLogin} disabled={loading || !email || !password} className="btn-primary mt-1">
              {loading ? '...' : 'Sign In'}
            </button>
          </div>
        )}

        {error && <p className="text-[12px] text-[#DC2626] mt-4 text-center a-fade">{error}</p>}

        <div className="divider my-6" />
        <p className="text-[13px] text-[#A3A3A3] text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#0A0A0A] font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
