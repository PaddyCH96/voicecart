# VoiceCart — CLAUDE.md

## Project Overview

VoiceCart is an AI-powered audio/video ad creation SaaS for Indian small businesses. Users record a Hindi voice note, and the platform transcribes it, generates marketing copy, creates a voiceover, and renders a 9:16 video ad — all in 11 Indian languages.

**Status:** Ready for deployment (147 tests passing, full-stack complete).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL/Prisma · BullMQ/Redis · OpenAI (Whisper + GPT-4o-mini) · ElevenLabs TTS · Cloudinary · Razorpay · Capacitor (iOS + Android)

---

## Key Links

- [IMPLEMENTATION.md](./IMPLEMENTATION.md) — Full deployment & go-to-market plan
- [PHASE.md](./PHASE.md) — Coding session log and implementation history
- [BUILD.md](./BUILD.md) — Previous session history
- [README.md](./README.md) — Project overview and quick start

---

## Critical Implementation Notes

### Environment Variables

All env vars are documented in `.env.example`. **Never commit `.env` to git.** The `.env` file has been flagged as a security issue — all secrets should be rotated before production deployment.

**Critical secrets to rotate before staging:**
- `JWT_SECRET` — generate with `openssl rand -base64 48`
- `CRON_SECRET` — generate with `openssl rand -base64 32`
- `RAZORPAY_KEY_SECRET` — rotate from Razorpay dashboard
- `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `MSG91_AUTH_KEY`

### Mobile App Configuration

The Capacitor config (`capacitor.config.ts`) currently has a local dev URL in `server.url`. **Remove this before building for production** — it causes the app to connect to a local IP that won't exist for end users.

Production build: `npm run build && npx cap sync android && npx cap sync ios`

### Database

PostgreSQL via Prisma ORM. Run migrations with: `npx prisma migrate deploy`

### Background Workers

BullMQ worker runs separately from the Next.js app. Start with `npm run worker` or via Docker `worker` service. Requires Redis to be running.

### Payment Flow

Razorpay is configured for both one-time credit purchases and Pro subscriptions. Webhook endpoint: `/api/subscription/webhook` — requires HTTPS in production and proper `RAZORPAY_WEBHOOK_SECRET` configured.

---

## Architecture Decisions

1. **Standalone Next.js build** — `output: "standalone"` in next.config.ts means the `.next/standalone` folder is deployed, not a containerized build. Worker runs as a separate process.

2. **BullMQ over in-process queues** — Decouples AI processing from HTTP request lifecycle. Worker runs separately from Next.js app.

3. **Redis fallback client** — `lib/redis.ts` has an in-memory fallback for local dev without Redis. In production, always use real Redis (Upstash or Railway Redis).

4. **Magic byte file validation** — Audio upload validation uses magic bytes (not MIME type), preventing extension spoofing attacks.

5. **Timing-safe signature verification** — All webhook and payment signature checks use `crypto.timingSafeEqual` with length pre-check to prevent timing attacks.

---

## Testing

```bash
npm test        # 147 unit + integration tests
npm run lint    # ESLint (currently 0 errors)
npm run test:e2e # Playwright E2E (12 scenarios)
```

---

## Adding New API Routes

1. Add route handler under `app/api/[route]/route.ts`
2. Add Zod validation schema in `lib/validation.ts`
3. Add rate limiting in `lib/rate-limit.ts` if endpoint is user-facing
4. Add auth protection (getSession for user routes, requireCronAuth for internal)
5. Add CSRF check (requireCsrf) for state-changing operations
6. Write tests in appropriate `test/*.test.ts` file

## Common Tasks

### Add a new language to voice translation
Edit `LANGUAGE_TO_ELEVENLABS` in `app/api/translate/voice/route.ts` — add the language code mapping.

### Change pricing
- Credit price: `app/api/verify-payment/route.ts` line 14 — `CREDIT_PRICE_PAISE`
- Pro subscription: `app/api/subscription/create/route.ts` — search for `49900` (₹499 in paise)

### Add a new OmniPost platform variant
Edit the `HINDI_COPYWRITER_SYSTEM_PROMPT` in both `app/api/process-ad/route.ts` and `lib/queue.ts`, then add the field to the expected JSON output.

---

## Gotchas

- **Port 3003** — Dev server runs on port 3003 (not default 3000). Don't run multiple instances.
- **Redis must be running** for rate limiting and BullMQ. Without it, the in-memory fallback is used (rate limiting disabled, queue won't persist).
- **`__Host-vc_token` cookie** requires HTTPS and secure context. Local development uses `vc_token` cookie for backward compat.
- **First ad free** — Logic is in `app/api/consume-credit/route.ts`. First ad is free per phone number.
- **Worker retries** — 3 attempts with exponential backoff (5s, 10s, 20s). After max retries, ad status is set to `failed`.