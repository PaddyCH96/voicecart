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
- **Auth**: JWT (jose) in httpOnly cookies with bcrypt password hashing
- **Validation**: Zod schemas for all 15+ API endpoints
- **Rate Limiting**: Redis-backed sliding window on auth and upload endpoints
- **Route Protection**: Middleware guards for dashboard, video, settings, assets, subscription, record, preview, success pages
- **Error Boundaries**: React ErrorBoundary component + global error page + custom 404

### Tech Stack
- **Framework**: Next.js 16.2 (App Router, Turbopack)
- **Database**: PostgreSQL via Prisma ORM
- **AI**: OpenAI GPT-4o-mini + Whisper, ElevenLabs TTS
- **Media**: Cloudinary (images, video, audio storage + transformation)
- **Payments**: Razorpay (orders, subscriptions, webhooks)
- **SMS/OTP**: MSG91
- **Queue/Rate Limit**: BullMQ + Upstash Redis (in-memory fallback)
- **Testing**: Jest + RTL (95 tests), Playwright (12 E2E scenarios)
- **Styling**: Tailwind CSS 4
- **Logging**: Pino structured logger
- **CI**: GitHub Actions (lint, test, build, E2E)

## Build History

See [BUILD.md](./BUILD.md) for the full session log.
