'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#0A0A0A]">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#FFF1E6] dark:bg-[#2A1A0A] flex items-center justify-center mx-auto mb-4">
          <Home size={24} className="text-[#E8590C]" />
        </div>
        <h2 className="text-[18px] font-semibold dark:text-white mb-2">Page Not Found</h2>
        <p className="text-[14px] text-[#A3A3A3] mb-6">Sorry, we could not find the page you are looking for.</p>
        <Link href="/" className="btn-primary w-full max-w-xs inline-flex items-center justify-center gap-2">
          <Home size={16} /> Go Home
        </Link>
      </div>
    </div>
  );
}