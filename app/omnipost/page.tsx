'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { generateOmnipostContent, OmnipostOutput } from '@/lib/omnipost-engine';
import { Mic, Square, Sparkles, Copy, Check, Globe, RefreshCw } from 'lucide-react';

type Lang = 'hi' | 'ta' | 'te' | 'bn' | 'mr';

const LANGS: Record<Lang, string> = {
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
};

const PLAFTORM_EMOJIS: Record<string, string> = {
  Instagram: '📸',
  WhatsApp: '💬',
  X: '🐦',
  'X Thread': '🧵',
  Facebook: '👥',
  YouTube: '▶️',
  LinkedIn: '💼',
  'Reels Hook': '📱',
  Pinterest: '📌',
  Email: '📧',
};

export default function OmniPostPage() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedLangs, setSelectedLangs] = useState<Lang[]>(['hi']);
  const [outputs, setOutputs] = useState<Record<string, OmnipostOutput[]>>({});

  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }>> }) => void;
    onerror: () => void;
  } | null>(null);

  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionCtor && !recognitionRef.current) {
      const recognition = new (SpeechRecognitionCtor as new () => object)() as {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start: () => void;
        stop: () => void;
        onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }>> }) => void;
        onerror: () => void;
      };
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';
      recognition.onresult = (event) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          final += event.results[i][0].transcript;
        }
        setTranscript(final);
      };
      recognition.onerror = () => setRecording(false);
      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      setTranscript('');
      setOutputs({});
      recognitionRef.current.start();
      setRecording(true);
    }
  }, [recording]);

  const toggleLang = (lang: Lang) => {
    setSelectedLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) return;
    setGenerating(true);
    setOutputs({});

    try {
      const results = await Promise.all(
        selectedLangs.map(async (lang) => {
          const items = await generateOmnipostContent(transcript, lang);
          return [lang, items] as [string, OmnipostOutput[]];
        })
      );
      setOutputs(Object.fromEntries(results));
    } catch (e) {
      console.error('Generation error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const copyText = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(platform);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(platform);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-10 max-w-4xl mx-auto w-full">
        <div className="mb-8 a-enter">
          <h1 className="text-[24px] font-semibold tracking-[-0.03em] dark:text-white mb-1">OmniPost Amplifier</h1>
          <p className="text-[13px] text-[#A3A3A3]">Speak in Hindi. Get platform-ready marketing copy in seconds.</p>
        </div>

        {/* Recording Section */}
        <div className="card p-6 mb-6 a-enter-1">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-medium dark:text-white">1. Record your pitch</h2>
            <button
              onClick={toggleRecording}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                recording
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110 a-ring'
                  : 'bg-[#F5F5F5] dark:bg-[#1F1F1F] text-[#737373] hover:bg-[#EBEBEB] dark:hover:bg-[#2A2A2A]'
              }`}
            >
              {recording ? <Square size={14} fill="currentColor" /> : <Mic size={16} />}
            </button>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={recording ? 'Listening...' : 'Or type your Hindi product pitch here...'}
            className="w-full h-28 resize-none px-4 py-3 rounded-[10px] border border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent outline-none text-[14px] placeholder:text-[#A3A3A3]"
          />
        </div>

        {/* Language Selection */}
        <div className="card p-6 mb-6 a-enter-2">
          <h2 className="text-[15px] font-medium dark:text-white mb-3">2. Select languages</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(LANGS) as Lang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => toggleLang(lang)}
                className={`px-3.5 py-1.5 rounded-[8px] text-[12px] font-medium border transition-all ${
                  selectedLangs.includes(lang)
                    ? 'bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] border-[#0A0A0A] dark:border-white'
                    : 'bg-transparent text-[#737373] border-[#E5E5E5] dark:border-[#2A2A2A] hover:border-[#A3A3A3]'
                }`}
              >
                {LANGS[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!transcript.trim() || generating || selectedLangs.length === 0}
          className="btn-primary w-full mb-8 gap-2 a-enter-3"
        >
          {generating ? (
            <><RefreshCw size={16} className="a-spin" /> Generating...</>
          ) : (
            <><Sparkles size={16} /> Generate OmniPost Content</>
          )}
        </button>

        {/* Results */}
        {Object.entries(outputs).map(([lang, items]) => (
          <div key={lang} className="mb-8 a-enter">
            <h3 className="text-[15px] font-medium dark:text-white mb-4 flex items-center gap-2">
              <Globe size={16} /> {LANGS[lang as Lang] || lang}
            </h3>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div
                  key={item.platform}
                  className="card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PLAFTORM_EMOJIS[item.platform] || '📝'}</span>
                      <span className="text-[13px] font-medium dark:text-white">{item.platform}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#A3A3A3] font-mono">{item.charCount} chars</span>
                      <button
                        onClick={() => copyText(item.content, item.platform)}
                        className="p-1.5 rounded-[6px] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] transition-colors"
                        title="Copy"
                      >
                        {copied === item.platform ? <Check size={13} className="text-[#16A34A]" /> : <Copy size={13} className="text-[#737373]" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[13px] text-[#525252] dark:text-[#A3A3A3] whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
