'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewVideoPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled Video', type: 'video' }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.project?.id) {
          router.replace(`/video/${data.project.id}`);
        } else {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/dashboard'));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] dark:bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] dark:border-[#2A2A2A] dark:border-t-white a-spin" />
        <p className="text-[13px] text-[#A3A3A3]">Creating workspace...</p>
      </div>
    </div>
  );
}
