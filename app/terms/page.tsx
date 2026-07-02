import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — VoiceCart',
  description: 'The terms and conditions governing your use of the VoiceCart service.',
};

export default function TermsPage() {
  const docsDir = path.join(process.cwd(), 'docs');
  const termsPath = path.join(docsDir, 'TERMS.md');

  let content = '';
  try {
    content = fs.readFileSync(termsPath, 'utf-8');
  } catch {
    content = '# Terms of Service\n\nTerms not available.';
  }

  const sections = content.split('\n## ');

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-[#D4AF37]">VoiceCart</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-8">Terms of Service</h2>
        <div className="prose prose-invert prose-sm max-w-none">
          {sections.map((section, i) => (
            <div key={i} className="mb-8">
              {i === 0 ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: section
                      .replace(/^#.*$/gm, '')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/^(.+)$/gm, (match) => {
                        if (match.startsWith('#') || match.startsWith('*') || match.startsWith('|')) return match;
                        return `<p>${match}</p>`;
                      }),
                  }}
                />
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-[#D4AF37] mb-3">{section.split('\n')[0]}</h3>
                  <div
                    className="text-gray-300 leading-relaxed space-y-2"
                    dangerouslySetInnerHTML={{
                      __html: section
                        .replace(/^.*?\n/, '')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                        .replace(/\|/g, '')
                        .replace(/\n/g, '<br/>'),
                    }}
                  />
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-gray-500">
          <p>Effective Date: July 2026</p>
          <p>Questions? Email <a href="mailto:legal@voicecart.app" className="text-[#D4AF37] hover:underline">legal@voicecart.app</a></p>
        </div>
      </main>
    </div>
  );
}