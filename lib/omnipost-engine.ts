export interface OmnipostOutput {
  platform: string;
  content: string;
  charCount: number;
  icon: string;
}

export async function generateOmnipostContent(
  transcript: string,
  language: string
): Promise<OmnipostOutput[]> {
  const res = await fetch('/api/omnipost/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, language }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generation failed' }));
    throw new Error(err.error || 'Generation failed');
  }

  const data = await res.json();
  return data.outputs as OmnipostOutput[];
}
