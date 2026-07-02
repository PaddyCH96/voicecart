# Build Log

> Session date: Thu Jul 02 2026

## What We Built

### Phase 1 — Critical Bugs
- Added missing env vars (`JWT_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_BASE_URL`, `RAZORPAY_PRO_PLAN_ID`)
- Fixed Capacitor `webDir` config
- Replaced translation stubs with real OpenAI + ElevenLabs calls
- Replaced asset upload stubs with real Cloudinary (including DELETE cleanup)
- Replaced video render `setTimeout` with proper async processing route
- Created real settings save/delete API endpoints
- Replaced one-time Razorpay orders with recurring subscriptions
- Secured webhook with `timingSafeEqual`, removed dev bypass
- Added auth + file validation to `upload-audio`, removed redundant OpenAI call

### Phase 2 — Security & Reliability
- Created `lib/validation.ts` with Zod schemas for all 15+ API endpoints
- Created `lib/rate-limit.ts` with Redis-backed sliding window
- Added rate limiting to login (5/5min), register (3/hr), send-otp (5/5min), verify-otp (10/5min), upload-audio (20/hr)
- Added middleware protection for `/record`, `/preview`, `/success`, `/omnipost`
- Added `CRON_SECRET` bearer auth to retry queue

### Phase 3 — Feature Gaps
- Created `/api/omnipost/generate` with GPT-4o-mini generating 10 platform-optimized variants
- Rewrote `lib/omnipost-engine.ts` from mock to real API client
- Cleaned up `any` casts and removed fake timeout in `app/omnipost/page.tsx`
- Implemented Cloudinary URL-based video composition in `lib/render-video.ts`

### Phase 4 — Architecture & Quality
- Installed and configured BullMQ queue system (`lib/queue.ts`) with `ad-processing` and `ad-retry` queues
- Replaced fire-and-forget `fetch` in `upload-audio` with `addAdProcessingJob()`
- Created `worker.ts` entry point for background workers
- Installed `pino` with `pino-pretty` for structured logging (`lib/logger.ts`)
- Created React `ErrorBoundary` component, `app/global-error.tsx`, and `app/not-found.tsx`
- Added Playwright E2E test scaffold (`e2e/flows.spec.ts`)
- Added Razorpay type declarations (`types/razorpay.d.ts`)
- Fixed `any` casts in `app/subscription/page.tsx`
- Fixed TypeScript `--strict` errors in `consume-credit`, `verify-payment`, `retry-queue` routes

### Phase 5 — Testing & Polish (this session)
- **Lint**: Fixed all 14 errors and 21 warnings — zero lint issues
  - React Compiler purity fixes (`Date.now`/`setState` in render pass)
  - Removed `any` types, unused imports/vars, `require()` imports
  - Fixed unescaped entities, hoisting bugs, `let`→`const` violations
- **Tests**: Expanded from 52 → 95 tests (3 suites)
  - New `test/lib.test.ts`: 43 tests covering Zod validation schemas, pricing, file size, language codes, MIME types
  - All validation schemas tested for valid/invalid/edge cases: `phoneSchema`, `loginSchema`, `registerSchema`, `verifyOtpSchema`, `uploadAudioSchema`, `translateTextSchema`, `createProjectSchema`, `createOrderSchema`, `verifyPaymentSchema`, `subscriptionCreateSchema`, `omnipostSchema`, `assetUploadSchema`
- **E2E**: Expanded from 5 → 12 Playwright scenarios
  - Auth redirect tests, form assertions, 404 page, subscription pricing visibility
- **Build**: `npm run build` passes (TypeScript + Next.js compilation)
- **Test count**: 3 suites, 95 tests, all passing

### Phase 6 — Docs & CI (this session)
- **README.md**: Complete rewrite with worker docs, troubleshooting guide, rate limit table, project structure, deployment options
- **BUILD.md**: This file — session log
- **CI**: `.github/workflows/ci.yml` — lint, test (95), build, and E2E stages with PostgreSQL service
- **Scripts**: Added `worker` and `test:e2e` to `package.json`

## Next Steps

### Pre-Production
- Run Redis in production (Upstash or self-hosted)
- Deploy to staging, verify all env vars configured
- Start worker process in production alongside Next.js (`pm2` or `supervisord`)
- Configure MSG91 for production OTP delivery

### Optional Enhancements
- Add Remotion or Shotstack for advanced video rendering (beyond Cloudinary URL composition)
- Add Sentry or similar error tracking for production monitoring
- Add rate limit bypass for admin/pro users
- Implement proper credit deduction with Stripe-like idempotency keys
- Add WebSocket-based real-time ad status updates (instead of polling)
- Add admin dashboard for managing users and monitoring jobs
- Add more comprehensive integration tests against a test database
- Add Storybook for component documentation
- Set up staging/preview deployments (Vercel Preview or similar)

### Known Issues
- Build warns about `next-pwa` config (unrecognized keys) — PWA plugin needs a Next.js 16-compatible update
- Middleware uses deprecated `middleware.ts` convention — Next.js 16 recommends `proxy.ts`
- Redis connection errors during `next build` when Redis is not running locally (build still succeeds)

## Next Implementation Plan

### 1. Pre-Production Hardening
| Priority | Task | Details |
|----------|------|---------|
| P0 | Deploy to staging | Provision server, set up PostgreSQL + Redis, configure all env vars, run worker |
| P0 | Production Redis | Set up Upstash or self-hosted Redis; verify BullMQ queues and rate limiting work |
| P0 | Worker deployment | Add `npm run worker` to production process manager (PM2/supervisord/systemd) |
| P1 | MSG91 production config | Verify OTP delivery works with production MSG91 credentials |
| P1 | Cloudinary production config | Verify uploads, transformations, and renders work with production Cloudinary keys |
| P1 | Razorpay production keys | Switch from test to live keys; verify subscription webhooks |

### 2. Testing Gaps
| Priority | Task | Details |
|----------|------|---------|
| P1 | Integration tests with real DB | Add test suite that runs against a test PostgreSQL database to test API routes end-to-end |
| P1 | Worker processing tests | Test the full Whisper → GPT → ElevenLabs pipeline with mock API responses |
| P1 | Auth flow tests | Register → login → session persistence → logout → redirect |
| P2 | Rate limit integration tests | Verify 429 responses when limits are exceeded |
| P2 | Payment webhook tests | Test Razorpay webhook signature verification with real payloads |
| P2 | E2E CI pipeline | Ensure Playwright tests run in CI with a working server + test DB |

### 3. Developer Experience
| Priority | Task | Details |
|----------|------|---------|
| P0 | Fix middleware deprecation | Migrate from `middleware.ts` to `proxy.ts` (Next.js 16 convention) |
| P0 | Fix next-pwa config | Update or replace PWA plugin to be Next.js 16 compatible |
| P1 | Add `npm run db:push` script | For quick schema sync without migration files |
| P1 | Create `.env.example` | Document every env var with descriptions and placeholder values |
| P1 | Add Storybook | Component library for DashboardLayout, ErrorBoundary, PaymentModal, etc. |
| P2 | Supabase/Neon local setup | Document how to connect to Neon free tier PostgreSQL |

### 4. Feature Additions
| Priority | Task | Details |
|----------|------|---------|
| P1 | Real-time ad status | Replace polling in `/preview` with WebSocket or SSE via Redis pub/sub |
| P1 | Video rendering upgrade | Add Remotion or Shotstack for complex multi-layer 9:16 renders (Cloudinary URL composition is limited) |
| P1 | Admin dashboard | User management, job monitoring, rate limit overrides, revenue metrics |
| P2 | Pro user rate limit bypass | Skip rate limiting for users with `plan: 'pro'` |
| P2 | Idempotent credit deduction | Add idempotency key support to prevent double-charging on retry |
| P2 | Multi-language UI | Offer the app UI itself in Hindi and other Indian languages |
| P3 | WhatsApp Business API | Direct posting to WhatsApp Business instead of just share URL generation |
| P3 | Instagram Reels auto-publish | Direct publishing to Instagram/Reels API |
| P3 | Analytics dashboard | Track ad views, clicks, conversions for Pro users |

### 5. Monitoring & Observability
| Priority | Task | Details |
|----------|------|---------|
| P1 | Error tracking | Add Sentry for production error monitoring (already wired in ErrorBoundary) |
| P1 | Queue monitoring | Add BullMQ Dashboard or Arena UI for queue observability |
| P2 | Structured logging | Ship Pino logs to production log aggregator (Datadog, Logtail, etc.) |
| P2 | Uptime monitoring | Set up health check endpoint and external monitoring |
| P2 | Performance budgets | Track Lighthouse scores, bundle size, API latency in CI |

### 6. Release & Workflow
| Priority | Task | Details |
|----------|------|---------|
| P1 | Create staging branch | `git checkout -b staging` for pre-production deployments |
| P1 | Vercel preview deployments | Connect repo to Vercel for automatic preview on PRs |
| P2 | Semantic release | Set up automated changelog + version bump on merge to main |
| P2 | Docker optimizations | Multi-stage build, layer caching, health checks |

---

*Last pushed: Thu Jul 02 2026 to github.com/PaddyCH96/voicecart*
