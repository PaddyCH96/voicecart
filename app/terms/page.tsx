import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-[#D4AF37]">VoiceCart</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-gray-500">
          <p>Effective Date: July 2026</p>
          <p>Questions? Email <a href="mailto:legal@voicecart.app" className="text-[#D4AF37] hover:underline">legal@voicecart.app</a></p>
        </div>
      </main>
    </div>
  );
}