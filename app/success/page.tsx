'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

interface AdData {
  id: string;
  outputAudioUrl?: string;
  inputAudioUrl: string;
  generatedText?: { instagram: string; whatsapp: string; hook: string };
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const adId = searchParams.get('adId');
  const [ad, setAd] = useState<AdData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adId) return;
    fetch(`/api/ad/${adId}`).then(r => r.json()).then(d => { setAd(d); setLoading(false); }).catch(() => setLoading(false));
  }, [adId]);

  const copy = useCallback(async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text;
      document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const shareWA = useCallback(() => {
    if (!ad?.generatedText) return;
    const text = `${ad.generatedText.whatsapp}\n\n🎧 ${ad.outputAudioUrl || ad.inputAudioUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [ad]);

  const download = useCallback(async () => {
    if (!ad) return;
    const url = ad.outputAudioUrl || ad.inputAudioUrl;
    try {
      const r = await fetch(url); const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = u; a.download = `voicecart-${adId}.mp3`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
    } catch { window.open(url, '_blank'); }
  }, [ad, adId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] a-spin" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-8">
      {/* Success header */}
      <div className="text-center pt-12 pb-8 a-enter">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#F0FDF4] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Your ad is ready</h1>
        <p className="text-[13px] text-[#A3A3A3] mt-1">Download and share</p>
      </div>

      {/* Audio + Download */}
      {ad && (
        <div className="card-raised p-4 mb-4 a-enter-1">
          <audio controls src={ad.outputAudioUrl || ad.inputAudioUrl} className="w-full h-10 mb-4" />
          <button id="download-button" onClick={download} className="btn-primary !text-[13px]">
            ↓ Download MP3
          </button>
        </div>
      )}

      {/* Text cards */}
      {ad?.generatedText && (
        <div className="flex flex-col gap-2.5 mb-5 a-enter-2">
          {[
            { k: 'instagram', label: 'Instagram', text: ad.generatedText.instagram },
            { k: 'whatsapp', label: 'WhatsApp', text: ad.generatedText.whatsapp },
            { k: 'hook', label: 'Hook', text: ad.generatedText.hook },
          ].map(({ k, label, text }) => (
            <div key={k} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="label">{label}</span>
                <button
                  onClick={() => copy(text, k)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                    copied === k ? 'text-[#16A34A] bg-[#F0FDF4]' : 'text-[#A3A3A3] hover:text-[#525252] hover:bg-[#FAFAFA]'
                  }`}
                >
                  {copied === k ? '✓' : 'Copy'}
                </button>
              </div>
              <p className="text-[13px] text-[#525252] leading-[1.65] whitespace-pre-wrap">{text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Share buttons */}
      <div className="flex gap-2.5 mb-4 a-enter-3">
        <button onClick={shareWA} className="btn-ghost flex-1 !text-[13px] !py-3 gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </button>
        <button onClick={() => ad?.generatedText && copy(ad.generatedText.instagram, 'share-ig')} className="btn-ghost flex-1 !text-[13px] !py-3">
          📸 Instagram
        </button>
      </div>

      {/* Create another */}
      <button onClick={() => router.push('/record')} className="w-full py-3 rounded-[14px] bg-[#E8590C] text-white text-[14px] font-medium hover:bg-[#D14F0A] transition-colors active:scale-[0.98] a-enter-4">
        + Create another ad
      </button>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] a-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
