'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('vc-install-dismissed');
      if (!dismissed) setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => { setShow(false); localStorage.setItem('vc-install-dismissed', 'true'); };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 a-sheet">
      <div className="max-w-md mx-auto bg-white rounded-[14px] border border-[#F0F0F0] p-3.5 flex items-center gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        <div className="w-9 h-9 rounded-[10px] bg-[#0A0A0A] flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">Install VoiceCart</p>
          <p className="text-[11px] text-[#A3A3A3]">App-like experience</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={dismiss} className="text-[12px] text-[#A3A3A3] px-2.5 py-1.5 rounded-[8px] hover:bg-[#FAFAFA] transition-colors">Later</button>
          <button onClick={install} className="text-[12px] font-medium text-white bg-[#0A0A0A] px-3.5 py-1.5 rounded-[8px] hover:bg-[#262626] transition-colors">Install</button>
        </div>
      </div>
    </div>
  );
}
