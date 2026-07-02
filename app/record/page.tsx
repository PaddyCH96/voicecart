'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type State = 'idle' | 'recording' | 'recorded' | 'uploading';

export default function RecordPage() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const MAX = 60;
  const MIN = 5;

  const requestWakeLock = useCallback(async () => {
    try { if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
  }, []);
  const releaseWakeLock = useCallback(() => { wakeLockRef.current?.release(); wakeLockRef.current = null; }, []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(buf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bars = 40;
      const gap = 2.5;
      const w = (canvas.width - (bars - 1) * gap) / bars;
      const cy = canvas.height / 2;

      for (let i = 0; i < bars; i++) {
        const idx = Math.floor((i / bars) * buf.length);
        const v = buf[idx] / 255;
        const h = Math.max(1.5, v * cy * 0.9);
        ctx.fillStyle = v > 0.5 ? '#E8590C' : v > 0.2 ? '#D4D4D4' : '#F0F0F0';
        ctx.beginPath();
        ctx.roundRect(i * (w + gap), cy - h, w, h * 2, 1);
        ctx.fill();
      }
    };
    draw();
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 44100, echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const src = audioCtx.createMediaStreamSource(stream);
      const an = audioCtx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      analyserRef.current = an;

      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        audioBlobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setState('recorded');
        releaseWakeLock();
      };

      mr.start(250);
      setState('recording');
      setDuration(0);
      requestWakeLock();

      timerRef.current = setInterval(() => {
        setDuration((p) => { if (p >= MAX - 1) { stopRecording(); return MAX; } return p + 1; });
      }, 1000);

      drawWaveform();
    } catch { setError('माइक्रोफोन की अनुमति दें'); }
  }, [drawWaveform, requestWakeLock, releaseWakeLock, stopRecording]);

  const handleToggle = useCallback(() => {
    if (state === 'idle' || state === 'recorded') {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      startRecording();
    } else if (state === 'recording') {
      if (duration < MIN) { setError(`कम से कम ${MIN} सेकंड`); return; }
      stopRecording();
    }
  }, [state, duration, audioUrl, startRecording, stopRecording]);

  const handleUpload = useCallback(async () => {
    if (!audioBlobRef.current) return;
    setState('uploading');
    setError(null);
    try {
      if (navigator.vibrate) navigator.vibrate(50);
      const fd = new FormData();
      fd.append('audio', audioBlobRef.current, 'recording.webm');
      fd.append('language', 'hi');
      const res = await fetch('/api/upload-audio', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      router.push(`/preview?adId=${data.adId}`);
    } catch { setError('अपलोड में समस्या'); setState('recorded'); }
  }, [router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      releaseWakeLock();
    };
  }, [audioUrl, releaseWakeLock]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const pct = (duration / MAX) * 100;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-8">
      {/* Nav */}
      <header className="flex items-center justify-between a-enter">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#FAFAFA] transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-[13px] font-medium">Record</span>
        <span className="text-[11px] text-[#A3A3A3]">Hindi</span>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        {/* Timer */}
        <div className="a-enter-1 text-center mb-2">
          <div className="text-[64px] font-light tabular-nums tracking-[-0.04em] leading-none text-[#0A0A0A]">
            {fmt(duration)}
          </div>
          <p className="text-[11px] text-[#A3A3A3] mt-2.5 h-4">
            {state === 'recording' && `${MIN}s — ${MAX}s`}
            {state === 'idle' && '5s – 60s'}
            {state === 'recorded' && `${fmt(duration)} recorded`}
            {state === 'uploading' && ''}
          </p>
        </div>

        {/* Progress (recording) */}
        {state === 'recording' && (
          <div className="w-full max-w-[200px] h-[2px] rounded-full bg-[#F0F0F0] overflow-hidden a-fade">
            <div className="h-full rounded-full bg-[#E8590C] transition-all duration-1000 ease-linear" style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* Waveform / Placeholder */}
        <div className="w-full h-12 my-4 a-enter-2">
          {state === 'recording' ? (
            <canvas ref={canvasRef} width={360} height={48} className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center gap-[2.5px] h-full opacity-30">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="w-[3px] rounded-full bg-[#D4D4D4]" style={{ height: `${3 + Math.abs(Math.sin(i * 0.4)) * 16}px` }} />
              ))}
            </div>
          )}
        </div>

        {/* Record button */}
        <div className="relative my-6 a-enter-2">
          {/* Pulse ring (only while recording) */}
          {state === 'recording' && (
            <div className="absolute inset-0 rounded-full bg-[#E8590C] opacity-20"
              style={{ animation: 'recording-ring 1.5s ease-out infinite' }} />
          )}
          <button
            id="record-button"
            onClick={handleToggle}
            disabled={state === 'uploading'}
            className={`relative w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all duration-200
              ${state === 'recording' ? 'bg-[#E8590C] a-breathe' : 'bg-[#0A0A0A] hover:bg-[#262626] active:scale-95'}
              ${state === 'uploading' ? 'opacity-20 cursor-not-allowed' : ''}`}
          >
            {state === 'recording' ? (
              <div className="w-[18px] h-[18px] rounded-[3px] bg-white" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
          </button>
        </div>

        <p className="text-[12px] text-[#A3A3A3] h-4">
          {state === 'idle' && 'टैप करें रिकॉर्ड करने के लिए'}
          {state === 'recording' && 'रुकने के लिए टैप करें'}
        </p>

        {error && <p className="text-[13px] text-[#DC2626] text-center mt-2 a-scale">{error}</p>}

        {/* After recording */}
        {state === 'recorded' && audioUrl && (
          <div className="w-full mt-4 a-scale">
            <audio controls src={audioUrl} className="w-full h-10 mb-5 [&::-webkit-media-controls-panel]:bg-[#FAFAFA]" />
            <div className="flex gap-2.5">
              <button onClick={handleToggle} className="btn-ghost flex-1 !text-[13px] !py-3">Re-record</button>
              <button id="use-recording-button" onClick={handleUpload} className="btn-primary flex-[2] !text-[13px] !py-3">Use this →</button>
            </div>
          </div>
        )}

        {state === 'uploading' && (
          <div className="text-center mt-6 a-scale">
            <div className="w-6 h-6 mx-auto mb-3 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] a-spin" />
            <p className="text-[13px] text-[#737373]">Processing</p>
          </div>
        )}
      </div>

      {/* Tips (idle only) */}
      {state === 'idle' && (
        <div className="a-enter-4 mt-auto">
          <div className="divider mb-5" />
          <p className="label mb-2.5">बेहतर रिकॉर्डिंग के लिए</p>
          <div className="flex flex-col gap-1">
            {['शांत जगह पर रिकॉर्ड करें', 'प्रोडक्ट का नाम और कीमत बताएं', 'फ़ोन को मुँह के पास रखें'].map((t, i) => (
              <p key={i} className="text-[12px] text-[#A3A3A3] pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-[#D4D4D4]">{t}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
