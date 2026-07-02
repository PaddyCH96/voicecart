'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import PaymentModal from '@/components/PaymentModal';
import { Globe, Volume2, Loader2, Copy } from 'lucide-react';

interface AdData {
  id: string;
  status: string;
  inputAudioUrl: string;
  outputAudioUrl?: string;
  transcript?: string;
  generatedText?: { instagram: string; whatsapp: string; hook: string };
}

type Langs = 'hi' | 'ta' | 'te' | 'kn' | 'mr';

const LANG_NAMES = {
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  mr: 'Marathi'
};

function PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const adId = searchParams.get('adId');
  
  const [ad, setAd] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [copied, setCopied] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  // Translation States
  const [lang, setLang] = useState<Langs>('hi');
  const [translatingText, setTranslatingText] = useState(false);
  const [translatingVoice, setTranslatingVoice] = useState(false);
  
  const [translatedContent, setTranslatedContent] = useState<Record<string, { instagram: string; whatsapp: string; hook: string }>>({});
  const [translatedAudioUrl, setTranslatedAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!adId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/ad/${adId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAd(data);
        if (data.status !== 'processing') { setLoading(false); return; }
      } catch { setError('Something went wrong'); setLoading(false); }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [adId]);

  const copy = useCallback(async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text;
      document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const handleTranslate = async (targetLang: Langs) => {
    setLang(targetLang);
    if (targetLang === 'hi' || translatedContent[targetLang]) return;

    if (!ad?.generatedText) return;

    setTranslatingText(true);
    setTranslatingVoice(true);

    try {
      // 1. Trigger text translations across all 3 platforms
      const [ig, wa, hk] = await Promise.all([
        fetch('/api/translate/text', { method: 'POST', body: JSON.stringify({text: ad.generatedText.instagram, targetLang}) }).then(r=>r.json()),
        fetch('/api/translate/text', { method: 'POST', body: JSON.stringify({text: ad.generatedText.whatsapp, targetLang}) }).then(r=>r.json()),
        fetch('/api/translate/text', { method: 'POST', body: JSON.stringify({text: ad.generatedText.hook, targetLang}) }).then(r=>r.json()),
      ]);

      setTranslatedContent(prev => ({
        ...prev,
        [targetLang]: {
          instagram: ig.translatedText,
          whatsapp: wa.translatedText,
          hook: hk.translatedText,
        }
      }));
      setTranslatingText(false);

      // 2. Mock TTS translation parallelly
      const voiceRes = await fetch('/api/translate/voice', { method: 'POST', body: JSON.stringify({ adId: ad.id, targetLang }) });
      const voiceData = await voiceRes.json();
      if (voiceData.translatedAudioUrl) setTranslatedAudioUrl(voiceData.translatedAudioUrl);
      
    } catch(e) { console.error('Translation failed', e); }
    finally { setTranslatingText(false); setTranslatingVoice(false); }
  };

  if (!adId) return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <p className="text-[14px] text-[#A3A3A3] mb-3">No ad found</p>
      <button onClick={() => router.push('/record')} className="text-[14px] font-medium underline underline-offset-2">Record one</button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-8 max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between mb-8 a-enter shrink-0">
        <button onClick={() => router.push('/record')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#FAFAFA] transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-[14px] font-medium">Review & Translate</span>
        <div className="w-8" />
      </header>

      {/* Processing */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 a-enter-1">
          <div className="w-7 h-7 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] a-spin" />
          <div className="text-center">
            <p className="text-[14px] font-medium text-[#0A0A0A]">Enhancing your ad</p>
            <p className="text-[12px] text-[#A3A3A3] mt-1">This takes about 15 seconds</p>
          </div>
          <div className="w-40 progress-bar" />
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-[14px] text-[#737373]">{error}</p>
          <button onClick={() => router.push('/record')} className="text-[14px] font-medium underline underline-offset-2">Try again</button>
        </div>
      )}

      {ad?.status === 'failed' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 a-enter">
          <p className="text-[14px] text-[#737373]">Processing failed</p>
          <button onClick={() => router.push('/record')} className="text-[14px] font-medium underline underline-offset-2">Re-record</button>
        </div>
      )}

      {/* Result */}
      {ad?.status === 'completed' && !loading && (
        <div className="flex flex-col gap-4 a-enter-1 pb-16">
          
          <div className="flex items-center justify-between mb-2">
            <div>
               <p className="text-[16px] font-semibold tracking-[-0.02em]">Assets Ready</p>
               <p className="text-[13px] text-[#A3A3A3]">Translate entire campaign with one click</p>
            </div>
            
            <select 
              value={lang}
              onChange={(e) => handleTranslate(e.target.value as Langs)}
              className="text-[12px] font-medium bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] px-3 py-1.5 outline-none appearance-none pr-8 cursor-pointer hover:bg-white"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230A0A0A%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              {(Object.keys(LANG_NAMES) as Langs[]).map(k => (
                <option key={k} value={k}>{LANG_NAMES[k]}</option>
              ))}
            </select>
          </div>

          <div className="card-raised p-4 relative overflow-hidden transition-all duration-300">
            {translatingVoice && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex items-center justify-center gap-2 text-[#0A0A0A] text-[13px] font-medium">
                <Loader2 size={16} className="animate-spin text-[#E8590C]" /> Generating {LANG_NAMES[lang]} voice...
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#FFF1E6] flex items-center justify-center">
                <Volume2 size={14} className="text-[#E8590C]" />
              </div>
              <div>
                <p className="text-[14px] font-medium">Enhanced audio</p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#A3A3A3]">
                   <Globe size={10} /> {LANG_NAMES[lang]} Voiceover
                </div>
              </div>
            </div>
            <audio controls src={(lang !== 'hi' && translatedAudioUrl) ? translatedAudioUrl : (ad.outputAudioUrl || ad.inputAudioUrl)} className="w-full h-10" />
          </div>

          {/* Text cards */}
          {ad.generatedText && (
            <div className="flex flex-col gap-2.5 relative">
              
              {translatingText && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center a-fade">
                   <div className="px-4 py-2 bg-white border border-[#E5E5E5] rounded-[24px] shadow-sm flex items-center gap-2 text-[12px] font-medium">
                      <Loader2 size={14} className="animate-spin text-[#0A0A0A]" /> Translating to {LANG_NAMES[lang]}...
                   </div>
                </div>
              )}

              {[
                { k: 'instagram', label: 'Instagram', text: lang === 'hi' ? ad.generatedText.instagram : (translatedContent[lang]?.instagram) },
                { k: 'whatsapp', label: 'WhatsApp', text: lang === 'hi' ? ad.generatedText.whatsapp : (translatedContent[lang]?.whatsapp) },
                { k: 'hook', label: 'Reel Hook', text: lang === 'hi' ? ad.generatedText.hook : (translatedContent[lang]?.hook) },
              ].map(({ k, label, text }) => (
                <div key={k} className={`card p-4 transition-opacity duration-300 ${!text && lang !== 'hi' ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="flex items-center justify-between mb-3 border-b border-[#F5F5F5] pb-2">
                    <span className="text-[12px] font-medium tracking-tight uppercase text-[#A3A3A3]">{label} / {LANG_NAMES[lang]}</span>
                    {text && (
                       <button
                         onClick={() => copy(text, k)}
                         className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors ${copied === k ? 'text-[#16A34A] bg-[#F0FDF4]' : 'text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]'}`}
                       >
                         {copied === k ? 'Copied' : <><Copy size={11} /> Copy</>}
                       </button>
                    )}
                  </div>
                  <p className="text-[13px] text-[#0A0A0A] leading-[1.6] whitespace-pre-wrap">{text || '...'}</p>
                </div>
              ))}
            </div>
          )}

          {/* CTA wrapper for spatial safety */}
          <div className="h-20" /> 
        </div>
      )}

      {/* Floating Action CTA */}
      {ad?.status === 'completed' && !loading && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0A0A0A] dark:via-[#0A0A0A]/95 z-40 a-slide-up">
           <div className="max-w-2xl mx-auto flex gap-2">
             <button onClick={() => router.push(`/video/new?adId=${ad.id}`)} className="flex-1 btn-ghost !py-3">
                Create Video
             </button>
             <button id="get-full-ad-button" onClick={() => setShowPayment(true)} className="flex-[2] btn-primary !py-3 shadow-xl">
                Download Set — ₹49
             </button>
           </div>
           <p className="text-[10px] text-[#A3A3A3] text-center mt-3 font-medium tracking-widest uppercase">First ad completely free</p>
        </div>
      )}

      {showPayment && adId && (
        <PaymentModal adId={adId} onClose={() => setShowPayment(false)} onSuccess={() => { setShowPayment(false); router.push(`/success?adId=${adId}`); }} />
      )}
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-white"><div className="w-6 h-6 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] a-spin" /></div>}>
      <PreviewContent />
    </Suspense>
  );
}
