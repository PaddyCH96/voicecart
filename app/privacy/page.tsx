import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const metadata: Metadata = {
  title: 'Privacy Policy — VoiceCart',
  description: 'How VoiceCart collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  const docsDir = path.join(process.cwd(), 'docs');
  const privacyPath = path.join(docsDir, 'PRIVACY.md');

  let content = '';
  try {
    content = fs.readFileSync(privacyPath, 'utf-8');
  } catch {
    content = '# Privacy Policy\n\nPrivacy policy not available.';
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
          <p>Last updated: July 2026</p>
          <p>Questions? Email <a href="mailto:privacy@voicecart.app" className="text-[#D4AF37] hover:underline">privacy@voicecart.app</a></p>
        </div>
      </main>
    </div>
  );
}