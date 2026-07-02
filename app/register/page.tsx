'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !email || !password) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      // JWT cookie is automatically set by the register endpoint
      router.push('/dashboard');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  };

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

        <h1 className="text-[24px] font-semibold tracking-[-0.03em] mb-1 a-enter-1">Create account</h1>
        <p className="text-[13px] text-[#A3A3A3] mb-7 a-enter-1">Get 1 free ad credit on signup</p>

        <div className="flex flex-col gap-3 a-enter-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus data-testid="register-name-input"
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-[15px] placeholder:text-[#D4D4D4]" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" data-testid="register-email-input"
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-[15px] placeholder:text-[#D4D4D4]" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" data-testid="register-password-input"
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] focus:border-[#D4D4D4] outline-none text-[15px] placeholder:text-[#D4D4D4]" />
          <button onClick={handleRegister} disabled={loading || !name || !email || !password} className="btn-primary mt-1" data-testid="register-button">
            {loading ? '...' : 'Create Account'}
          </button>
        </div>

        {error && <p className="text-[12px] text-[#DC2626] mt-4 text-center a-fade">{error}</p>}

        <div className="divider my-6" />
        <p className="text-[13px] text-[#A3A3A3] text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0A0A0A] font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
