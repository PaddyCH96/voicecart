import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = jest.fn(() => true);
  state = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start = jest.fn(() => { this.state = 'recording'; });
  stop = jest.fn(() => {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  });
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}

Object.defineProperty(global, 'MediaRecorder', {
  writable: true,
  value: MockMediaRecorder,
});

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() =>
      Promise.resolve({
        getTracks: () => [{ stop: jest.fn() }],
      })
    ),
  },
});

// Mock AudioContext
class MockAudioContext {
  createMediaStreamSource = jest.fn(() => ({
    connect: jest.fn(),
  }));
  createAnalyser = jest.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
  }));
}

Object.defineProperty(global, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

// Mock clipboard
Object.defineProperty(global.navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ad: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    project: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    asset: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    adProcessingJob: { create: jest.fn(), updateMany: jest.fn() },
    creditPurchase: { deleteMany: jest.fn() },
    subscription: { findUnique: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/openai', () => ({
  openai: {
    audio: { transcriptions: { create: jest.fn() } },
    chat: { completions: { create: jest.fn() } },
  },
}));

jest.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: {
    uploader: {
      upload: jest.fn(),
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

jest.mock('@upstash/redis', () => ({
  Redis: { fromEnv: jest.fn() },
}));
