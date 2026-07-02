import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-6">
      {/* Wordmark */}
      <header className="a-enter mb-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-[#0A0A0A] flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="text-[15px] font-medium tracking-[-0.02em]">VoiceCart</span>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center -mt-16">
        <h1 className="a-enter-1 text-[clamp(2.25rem,8vw,3rem)] font-semibold leading-[1.08] tracking-[-0.035em] mb-4">
          बोलिए।<br />
          <span className="text-[#E8590C]">AI बनाएगा।</span><br />
          बेचिए।
        </h1>

        <p className="a-enter-2 text-[15px] leading-[1.6] text-[#737373] max-w-[300px] mb-12">
          Record your voice in Hindi. Get a professional audio ad, 
          Instagram caption, and WhatsApp message — in seconds.
        </p>

        <Link
          href="/record"
          className="a-enter-3 btn-primary group"
        >
          <span>रिकॉर्ड शुरू करें</span>
          <svg className="w-[15px] h-[15px] ml-1.5 opacity-40 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </Link>

        <p className="a-enter-3 text-[12px] text-[#A3A3A3] text-center mt-3">
          First ad free · then ₹49
        </p>
      </section>

      {/* Steps */}
      <section className="a-enter-4 pt-6">
        <div className="divider mb-6" />
        <div className="grid grid-cols-3 gap-1 text-center">
          {[
            { n: "1", title: "Speak", sub: "in Hindi" },
            { n: "2", title: "Enhance", sub: "AI voice + copy" },
            { n: "3", title: "Share", sub: "WA · Insta" },
          ].map((s) => (
            <div key={s.n} className="py-2">
              <div className="text-[10px] font-medium text-[#D4D4D4] mb-1">{s.n}</div>
              <div className="text-[13px] font-medium text-[#0A0A0A]">{s.title}</div>
              <div className="text-[11px] text-[#A3A3A3] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
