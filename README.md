# VoiceCart

VoiceCart is a Next.js 16 (App Router) application for creating AI-powered audio and video ads from voice recordings. Built for Indian small-business owners to generate marketing content in Hindi and 10+ Indian languages.

## Features

### Core Features
- **Voice Recording** — Browser-based audio recording (5-60s) with waveform visualization and wake lock
- **AI Audio Ads** — Transcription (Whisper), marketing copy generation (GPT-4o-mini), and TTS voiceover (ElevenLabs Multilingual v2)
- **Multi-Language** — Translate text and voice to 11 Indian languages (Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, English, Hindi)
- **Video Editor** — 9:16 canvas with timeline, layers (images, videos, text, audio), and Cloudinary-rendered output
- **OmniPost** — Speech-to-text + AI-generated platform-specific content for 10 platforms (Instagram, WhatsApp, X, Threads, Facebook, YouTube, LinkedIn, Reels, Pinterest, Email)
- **Payments** — Razorpay integration: single credits (₹49/ad) and Pro subscription (₹499/mo)
- **Queue Processing** — BullMQ background job queue for ad processing with automatic retries
- **PWA** — Installable, offline-capable, push notifications ready
- **Mobile** — Capacitor (iOS/Android) with native web view

### Security & Reliability
- **Auth**: JWT (jose) in httpOnly cookies with SameSite=Strict, bcrypt password hashing, and placeholder detection
- **Validation**: Zod schemas for all 15+ API endpoints
- **Rate Limiting**: Redis-backed atomic sliding window on all auth, upload, payment, and AI-costly endpoints (12 rate-limited routes)
- **Route Protection**: Middleware cryptographically verifies JWT tokens (not just cookie existence)
- **CRON Auth**: Mandatory bearer token (`CRON_SECRET`) on all internal processing endpoints
- **OTP**: Timing-safe comparison (`crypto.timingSafeEqual`) to prevent brute-force side-channels
- **File Upload**: Content-type validation via magic byte signatures + strict size limits (10MB audio, 100MB assets)
- **Error Boundaries**: React ErrorBoundary component + global error page + custom 404

### Tech Stack
- **Framework**: Next.js 16.2 (App Router, Turbopack)
- **Database**: PostgreSQL via Prisma ORM
- **AI**: OpenAI GPT-4o-mini + Whisper, ElevenLabs TTS
- **Media**: Cloudinary (images, video, audio storage + transformation)
- **Payments**: Razorpay (orders, subscriptions, webhooks)
- **SMS/OTP**: MSG91
- **Queue/Rate Limit**: BullMQ + Upstash Redis
- **Testing**: Jest + RTL (147 tests), Playwright (12 E2E scenarios)
- **Styling**: Tailwind CSS 4
- **Logging**: Pino structured logger
- **CI**: GitHub Actions (lint, test, build, E2E)
- **Container**: Docker multi-stage build with separate web + worker services

## Feature Pipeline

How an audio recording becomes a finished ad:

1. **Record** — User records 5-60s audio in browser (`/record`)
2. **Upload** — Audio sent to `/api/upload-audio`, stored in Cloudinary (auth + rate-limited)
3. **Queue** — BullMQ job created for async processing (auto-retry on failure)
4. **Transcribe** — Worker calls OpenAI Whisper (Hindi-optimized)
5. **Generate** — GPT-4o-mini creates Instagram/WhatsApp/Hook copy
6. **Voiceover** — ElevenLabs generates Hindi TTS voiceover
7. **Delivery** — User views/downloads/shares result on `/success`

Worker runs via `npm run worker` or the `worker` Docker service (requires Redis).

## Quick Start

### Development

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Background Worker

```bash
npm run worker
```

### Testing

```bash
npm test            # Unit + integration (147 tests)
npm run test:e2e    # Playwright E2E (requires dev server)
```

### Docker

```bash
docker compose up --build    # All services (app + worker + postgres + redis)
docker compose up app         # Web app only
docker compose up worker      # Worker only (http://localhost:3004)
```

### Key Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 chars, must not be a placeholder |
| `CRON_SECRET` | Yes | Shared secret for internal endpoint auth |
| `OPENAI_API_KEY` | Yes | Whisper + GPT-4o-mini |
| `ELEVENLABS_API_KEY` | For voiceover | ElevenLabs TTS |
| `CLOUDINARY_*` | Yes | Media storage + rendering |
| `RAZORPAY_*` | For payments | Orders + subscriptions |
| `MSG91_AUTH_KEY` | For OTP | SMS delivery |
| `REDIS_HOST` / `REDIS_PORT` | Yes | BullMQ + rate limiting |

## Recent Updates (2026-07-03)

### CI & Code Quality Fixes
- ✅ **Fixed CI Pipeline** — Added ts-node for Jest TypeScript config parsing
- ✅ **Fixed Markdown Rendering** — Replaced regex parser with react-markdown + remark-gfm for Privacy/Terms pages
- ✅ **Fixed Rate Limiting** — Redis fallback now properly expires keys in dev/local mode
- ✅ **Updated Documentation** — Corrected Android/iOS build commands in IMPLEMENTATION.md
- ✅ **Security** — Removed dangerouslySetInnerHTML XSS risk from legal pages

**Test Status:** 147 tests passing | 0 lint errors | All CodeRabbit issues resolved

See [DEBUGGER.md](./DEBUGGER.md) for detailed debug session log.

## Build History

See [PHASE.md](./PHASE.md) for the full session log and implementation progress.
