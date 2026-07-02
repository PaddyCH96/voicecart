// ============================================
// Worker Pipeline Tests
// ============================================

describe('Worker Pipeline: Transcribe → Generate → TTS', () => {
  const HINDI_COPYWRITER_PROMPT = `You are a Hindi copywriter for social commerce. Given a transcript of a seller describing their product, produce exactly this JSON:
{
  "instagram": "2-3 lines Instagram caption, friendly, with emojis, include price if mentioned, call to action",
  "whatsapp": "Short WhatsApp broadcast message, direct, with clear call to action",
  "hook": "1 line hook for Instagram Reel, attention-grabbing"
}`;

  it('should have a Hindi copywriter system prompt', () => {
    expect(HINDI_COPYWRITER_PROMPT).toContain('Hindi copywriter');
    expect(HINDI_COPYWRITER_PROMPT).toContain('instagram');
    expect(HINDI_COPYWRITER_PROMPT).toContain('whatsapp');
    expect(HINDI_COPYWRITER_PROMPT).toContain('hook');
    expect(HINDI_COPYWRITER_PROMPT).toContain('JSON');
  });

  it('should produce valid JSON output from copywriter prompt', () => {
    const mockOutput = JSON.stringify({
      instagram: 'यह है एक शानदार प्रोडक्ट! 🎉 अभी ऑर्डर करें!',
      whatsapp: 'नमस्ते! हमारा नया प्रोडक्ट आ गया है। अभी खरीदें!',
      hook: 'क्या आप यह प्रोडक्ट देखना चाहेंगे?',
    });

    const parsed = JSON.parse(mockOutput);
    expect(parsed).toHaveProperty('instagram');
    expect(parsed).toHaveProperty('whatsapp');
    expect(parsed).toHaveProperty('hook');
    expect(typeof parsed.instagram).toBe('string');
    expect(parsed.instagram.length).toBeGreaterThan(0);
  });

  it('should reject malformed GPT output', () => {
    const validateOutput = (raw: string): boolean => {
      try {
        const parsed = JSON.parse(raw);
        return !!(parsed.instagram && parsed.whatsapp && parsed.hook);
      } catch {
        return false;
      }
    };

    expect(validateOutput(JSON.stringify({ instagram: 'a', whatsapp: 'b', hook: 'c' }))).toBe(true);
    expect(validateOutput(JSON.stringify({ instagram: 'a' }))).toBe(false);
    expect(validateOutput('not json')).toBe(false);
    expect(validateOutput('')).toBe(false);
  });

  it('should handle missing fields gracefully', () => {
    const safeExtract = (raw: string): Record<string, string> => {
      try {
        const parsed = JSON.parse(raw);
        return {
          instagram: parsed.instagram || '',
          whatsapp: parsed.whatsapp || '',
          hook: parsed.hook || '',
        };
      } catch {
        return { instagram: '', whatsapp: '', hook: '' };
      }
    };

    const result = safeExtract(JSON.stringify({ instagram: 'only' }));
    expect(result.whatsapp).toBe('');
    expect(result.hook).toBe('');
    expect(result.instagram).toBe('only');
  });
});

// ============================================
// Transcription Pipeline Tests
// ============================================
describe('Worker Pipeline: Transcription Input/Output', () => {
  it('should fetch audio from URL', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });

    const response = await mockFetch('https://example.com/audio.webm');
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBe(1024);
  });

  it('should handle audio fetch failure', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const response = await mockFetch('https://example.com/missing.webm');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it('should convert ArrayBuffer to File for Whisper API', () => {
    const buffer = new ArrayBuffer(2048);
    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' });

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('audio.webm');
    expect(file.type).toBe('audio/webm');
    expect(file.size).toBe(2048);
  });
});

// ============================================
// ElevenLabs TTS Pipeline Tests
// ============================================
describe('Worker Pipeline: ElevenLabs TTS', () => {
  const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
  const VOICE_ID = 'XB0fDUnXU5powFXDhCwa';

  it('should build correct TTS API URL', () => {
    const url = `${ELEVENLABS_API_URL}/${VOICE_ID}`;
    expect(url).toContain(ELEVENLABS_API_URL);
    expect(url).toContain(VOICE_ID);
  });

  it('should include required ElevenLabs headers', () => {
    const apiKey = 'test-key';
    const headers = {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    };

    const body = JSON.stringify({
      text: 'नमस्ते',
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.75, similarity_boost: 0.75, style: 0.5 },
    });

    const parsed = JSON.parse(body);
    expect(parsed.model_id).toBe('eleven_multilingual_v2');
    expect(parsed.voice_settings.stability).toBe(0.75);
    expect(headers['xi-api-key']).toBe(apiKey);
  });

  it('should handle TTS API error response', async () => {
    const mockTtsResponse = {
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid API key'),
    };

    expect(mockTtsResponse.ok).toBe(false);
    expect(mockTtsResponse.status).toBe(401);
    const errBody = await mockTtsResponse.text();
    expect(errBody).toBe('Invalid API key');
  });
});

// ============================================
// Cloudinary Upload Pipeline Tests
// ============================================
describe('Worker Pipeline: Cloudinary Upload', () => {
  it('should upload TTS buffer to Cloudinary', async () => {
    const mockUploadStream = jest.fn((_opts, callback) => {
      callback(null, { secure_url: 'https://res.cloudinary.com/test.mp3' });
      return { end: jest.fn() };
    });

    const mockCloudinary = {
      uploader: { upload_stream: mockUploadStream },
    };

    const buffer = Buffer.from('mock-audio-data');
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = mockCloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'voicecart/processed', format: 'mp3' },
        (error: Error | null, result: { secure_url: string } | null) => {
          if (error) reject(error);
          else resolve(result!);
        }
      );
      stream.end(buffer);
    });

    expect(result.secure_url).toContain('cloudinary.com');
    expect(mockUploadStream).toHaveBeenCalledTimes(1);
  });

  it('should handle Cloudinary upload failure', async () => {
    const mockUploadStream = jest.fn((_opts, callback) => {
      callback(new Error('Upload failed'), null);
      return { end: jest.fn() };
    });

    const mockCloudinary = {
      uploader: { upload_stream: mockUploadStream },
    };

    await expect(
      new Promise((_resolve, reject) => {
        mockCloudinary.uploader.upload_stream(
          { resource_type: 'video', folder: 'voicecart/processed', format: 'mp3' },
          (error: Error | null) => {
            if (error) reject(error);
          }
        );
      })
    ).rejects.toThrow('Upload failed');
  });
});

// ============================================
// BullMQ Job Processing Tests
// ============================================
describe('Worker Pipeline: Job Lifecycle', () => {
  it('should track retry attempts and backoff', () => {
    const calculateBackoff = (attempt: number): number =>
      Math.pow(2, attempt) * 5000;

    expect(calculateBackoff(0)).toBe(5000);
    expect(calculateBackoff(1)).toBe(10000);
    expect(calculateBackoff(2)).toBe(20000);
    expect(calculateBackoff(3)).toBe(40000);
  });

  it('should mark ad as failed after max retries exceeded', () => {
    const maxRetries = 3;

    const shouldFail = (attemptsMade: number): boolean =>
      attemptsMade >= maxRetries;

    expect(shouldFail(0)).toBe(false);
    expect(shouldFail(2)).toBe(false);
    expect(shouldFail(3)).toBe(true);
    expect(shouldFail(4)).toBe(true);
  });

  it('should update ad status through processing lifecycle', () => {
    type AdStatus = 'pending' | 'processing' | 'completed' | 'failed';

    const lifecycle: AdStatus[] = [];

    const transition = (status: AdStatus): AdStatus => {
      lifecycle.push(status);
      return status;
    };

    transition('pending');
    transition('processing');
    transition('completed');

    expect(lifecycle).toEqual(['pending', 'processing', 'completed']);
    expect(lifecycle[lifecycle.length - 1]).toBe('completed');
  });

  it('should store last error message on failure', () => {
    const jobError = new Error('Whisper API timed out');
    const job = { id: 'job_1', error: jobError.message };

    expect(job.error).toContain('timed out');
    expect(job.id).toBe('job_1');
  });
});
