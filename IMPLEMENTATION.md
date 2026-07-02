# VoiceCart — Implementation & Go-to-Market Plan

> Status: **Ready for deployment** — 147 tests passing, full-stack complete
> Owner: Prudhvi Kadamuthuri
> Stack: Next.js 16 · React 19 · PostgreSQL · Prisma · BullMQ · Redis · OpenAI · ElevenLabs · Cloudinary · Razorpay · Capacitor

---

## 1. Product Summary

**What it does:** Indian small-business owners record a voice note describing their product, and VoiceCart transcribes it (Whisper), generates marketing copy for 10 platforms (GPT-4o-mini), creates a Hindi voiceover (ElevenLabs), and renders a 9:16 video ad (Cloudinary) — all in Hindi + 10 other Indian languages.

**Target user:** Hindi/regional-language-speaking Indian small businesses (kirana shops, street vendors, small manufacturers) who want professional marketing content but can't write copy or produce video.

**Business model:** Freemium. First ad free. Then ₹49 per ad or ₹499/month Pro subscription.

---

## 2. Current State Assessment

### What's Built
| Component | Status | Notes |
|-----------|--------|-------|
| Next.js web app | ✅ Complete | App Router, Turbopack, standalone build |
| Auth (JWT + OTP) | ✅ Complete | Phone/email login, timing-safe OTP |
| Ad processing pipeline | ✅ Complete | Whisper → GPT-4o-mini → ElevenLabs → Cloudinary |
| Payments (Razorpay) | ✅ Complete | One-time credits + Pro subscription |
| Background workers | ✅ Complete | BullMQ + Redis, 3-retry backoff |
| Database schema | ✅ Complete | 8 Prisma models, proper relations |
| File validation | ✅ Complete | Magic byte signatures, size limits |
| Rate limiting | ✅ Complete | Redis sliding window, 12 routes |
| Unit tests | ✅ 147 passing | 6 suites, all green |
| E2E tests | ✅ 12 scenarios | Playwright |
| CI pipeline | ✅ Configured | GitHub Actions (lint/test/build/E2E) |
| Docker | ✅ Ready | Multi-stage build, app + worker services |
| Mobile (Android) | ⚠️ Scaffolded | Capacitor project exists, needs config |
| Mobile (iOS) | ⚠️ Scaffolded | Capacitor project exists, needs config |

### Immediate Gaps Before Launch

| Gap | Risk | Fix |
|-----|------|-----|
| `.env` tracked in git | **CRITICAL** — secrets exposed | Add to `.gitignore`, use env vars |
| Capacitor `server.url` points to local IP | **CRITICAL** — app won't work | Point to deployed HTTPS URL |
| No production Redis/Postgres hosting | **HIGH** — can't scale | Provision managed services |
| No HTTPS for webhook callbacks | **HIGH** — Razorpay webhooks require HTTPS | Deploy behind TLS |
| No staging environment | **MEDIUM** — can't test safely | Clone infra for staging |
| Android Play Store assets missing | **MEDIUM** — can't publish | Create icons, screenshots, store listing |
| iOS App Store assets missing | **MEDIUM** — can't publish | Create icons, screenshots, store listing |

---

## 3. Infrastructure Architecture

### Recommended Setup

```
                    ┌─────────────────────────────────────┐
                    │          Production Host            │
                    │   (Railway / Render / DigitalOcean)  │
                    │                                     │
  ┌──────────────┐  │  ┌──────────────┐  ┌─────────────┐ │
  │   Browser    │──┼─▶│  Next.js     │  │   Worker    │ │
  │   / App      │  │  │  (app:3000)  │  │  (tsx)      │ │
  └──────────────┘  │  └──────┬───────┘  └──────┬──────┘ │
                    │         │                 │        │
                    │  ┌──────▼───────┐  ┌──────▼──────┐ │
                    │  │  PostgreSQL  │  │   Redis     │ │
                    │  │  (managed)   │  │  (managed)  │ │
                    │  └─────────────┘  └─────────────┘ │
                    └─────────────────────────────────────┘
                              │
                    External Services:
                    ├── OpenAI API (Whisper + GPT-4o-mini)
                    ├── ElevenLabs API (TTS)
                    ├── Cloudinary (media storage + transform)
                    ├── Razorpay (payments + webhooks → HTTPS callback)
                    └── MSG91 (OTP SMS)
```

### Hosting Options (Ranked by Simplicity + Cost)

| Provider | Pros | Cons | Estimated Cost |
|----------|------|------|----------------|
| **Railway** | Postgres + Redis + App + Worker in one; simple UI; auto-deploys from GitHub | Slightly expensive at scale | ~$20-40/mo starter |
| **Render** | Similar to Railway; good free tier for hobby dev | Workers require separate service | ~$20-40/mo |
| **DigitalOcean App Platform** | Full control; $10/mo starter; PostgreSQL + App + Worker | Config-driven, less GUI | ~$10-30/mo |
| **Vercel + Supabase + Upstash** | Best-in-class DX; free tier; global CDN | Worker must be separate (not on Vercel) | ~$0-50/mo |
| **Self-hosted (DigitalOcean VPS)** | Full control; cheapest at scale | Ops overhead; you manage everything | ~$10-20/mo + your time |

**Recommendation:** Start with **Railway** — fastest path to production with managed Postgres + Redis + auto-deploy. Graduate to DigitalOcean App Platform when you want cheaper long-term hosting.

---

## 4. Deployment: Step-by-Step

### Phase 0: Pre-Flight (Day 0 — 2 hours)

#### 0.1 Fix `.env` Security Leak
```bash
# Check if .env is being tracked
git log --oneline --all -- .env | head

# If tracked, rotate all secrets immediately:
# 1. Regenerate JWT_SECRET (64+ chars)
# 2. Regenerate CRON_SECRET
# 3. Rotate Razorpay keys from dashboard
# 4. Rotate OpenAI, ElevenLabs, MSG91 keys

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Create production env template (no real values)
cp .env.example .env.production
# Remove all real values from .env.example, add comments
```

#### 0.2 Update Capacitor Config for Production
```typescript
// capacitor.config.ts — update for production
const config: CapacitorConfig = {
  appId: 'com.voicecart.creator',
  appName: 'VoiceCart',
  webDir: '.next',
  // FOR STAGING/PRODUCTION: Remove server.url and cleartext
  // App will load bundled web assets from the APK itself
  // Only needed for local dev with live reload
  // server: { url: 'http://192.168.0.5:3003', cleartext: true }, ← REMOVE
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0A0A0A",
      showSpinner: true,
    },
  },
  android: {
    backgroundColor: "#0A0A0A",
  },
  ios: {
    backgroundColor: "#0A0A0A",
    cordovaMimeTypeSwitches: {},
  },
};
```

#### 0.3 Create `.github/workflows/production-deploy.yml`
Add a deployment workflow that deploys to staging on PR merge, and production on git tag.

---

### Phase 1: Staging Deployment (Day 0-1)

Deploy to a staging environment to verify all integrations before going live.

#### 1.1 Provision Infrastructure on Railway
1. Create Railway account → New Project → "Deploy from GitHub repo"
2. Add PostgreSQL plugin → copy connection string
3. Add Redis plugin → copy connection string
4. Add Environment Variables from `.env.example` (use real values)
5. Set `NEXT_PUBLIC_BASE_URL=https://voicecart-staging.up.railway.app` (or your URL)
6. Set `NODE_ENV=production`
7. **Critical env vars to configure:**
   - `JWT_SECRET` — generate: `openssl rand -base64 48`
   - `CRON_SECRET` — generate: `openssl rand -base64 32`
   - `OPENAI_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
   - `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`

#### 1.2 Run Database Migration
Railway automatically runs `npm run build` if you configure the start command. But you need to run Prisma migrations:
```bash
# Add a Railway startup command:
# npx prisma migrate deploy && npm run start
```
Or add to docker-compose.yml's entrypoint.

#### 1.3 Configure Razorpay Webhook
1. Go to Razorpay Dashboard → Webhooks → Add webhook
2. URL: `https://voicecart-staging.up.railway.app/api/subscription/webhook`
3. Events: `subscription.charged`, `subscription.completed`, `subscription.cancelled`
4. Save the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

#### 1.4 Verify Staging
- [ ] Open `https://voicecart-staging.up.railway.app` — landing page loads
- [ ] Register/login with test phone number
- [ ] Record a test audio ad (or use dev OTP bypass)
- [ ] Verify ad processes: `/api/health` returns 200
- [ ] Check BullMQ dashboard (if enabled) for job queue
- [ ] Test payment flow with Razorpay test keys
- [ ] Check browser console for errors

---

### Phase 2: Mobile App — Android (Day 1-3)

#### 2.1 Build Web App for Mobile
```bash
cd ~/projects/voicecart
npm run build  # Creates .next/ with standalone output
npx cap sync android
```

#### 2.2 Configure Android for Release
```bash
# Update android/app/build.gradle for release signing
# Add your keystore config:
android {
    signingConfigs {
        release {
            keyAlias 'voicecart'
            keyPassword '...'
            storeFile file('keystore/voicecart-release.keystore')
            storePassword '...'
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

#### 2.3 Create Play Store Assets
- **App Icon:** 512x512 PNG (Google Play) + all required sizes (use `public/icons/`)
- **Screenshots:** 1080x1920 for phone, 2048x2732 for tablet
  - Screenshot 1: Landing page with Hindi hero text
  - Screenshot 2: Recording UI
  - Screenshot 3: Ad preview/success page
  - Screenshot 4: Payment/pricing page
- **Feature Graphic:** 1024x500 PNG
- **Description:** Write 80-char short description + 400-char full description

#### 2.4 Create Developer Account
1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay $25 one-time fee (Google Play Developer account)
3. Create app → Fill store listing → Upload APK/AAB
4. Set up pricing (Free or Paid)
5. Set up Countries (India initially)
6. Content rating: Mark as "All age groups" but note audio recording
7. Submit for review (~1-3 days)

#### 2.5 Build Release APK/AAB
```bash
cd android
./gradlew bundleRelease  # Creates app-release.aab for Play Store
# Upload to Play Store Console
```

---

### Phase 3: Mobile App — iOS (Day 1-3)

#### 3.1 Prerequisites
- Apple Developer Account ($99/year)
- Xcode 15+ installed
- iOS Simulator or physical device for testing

#### 3.2 Build
```bash
cd ~/projects/voicecart
npm run build
npx cap sync ios
cd ios
open App/App.xcworkspace  # Opens Xcode
```

#### 3.3 Configure Signing in Xcode
1. Select "Any iOS Device" as target
2. Product → Archive → Sign with your Apple Developer account
3. Fix any provisioning profile issues
4. Validate and distribute

#### 3.4 App Store Connect Setup
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create new app → Fill metadata
3. Upload build via Xcode Organizer or Transporter app
4. Write App Store listing (same screenshots/description as Android)
5. Submit for review (~1-7 days for first app)

---

### Phase 4: Production Deployment (Day 3-5)

#### 4.1 Provision Production Infrastructure
Same as staging but with:
- Production database (Neon/Supabase/Railway Postgres with backups)
- Production Redis (Upstash or Railway Redis with persistence)
- Real Razorpay live keys
- `NEXT_PUBLIC_BASE_URL=https://voicecart.com` (or your domain)

#### 4.2 Domain & TLS
- Buy domain: `voicecart.in` or `voicecart.app` (~₹800-1000/year on GoDaddy/Namecheap)
- Point DNS to your hosting provider
- Enable auto-HTTPS (most providers do this automatically)

#### 4.3 Configure DNS
```
A record: @ → <your-server-ip>
CNAME: www → your-app.railway.app
```

#### 4.4 Final Pre-Launch Checklist
```
Auth & Security:
□ JWT_SECRET rotated from staging (never reused)
□ CRON_SECRET rotated from staging
□ All API keys rotated from staging
□ HTTPS enforced on all endpoints
□ Rate limiting verified working in production
□ Razorpay webhooks firing correctly (check webhook logs)
□ OTP SMS sending in production (MSG91 live credentials)

Database:
□ Prisma migrate has run on production DB
□ Production DB has no test data
□ DB backups configured (daily snapshots)

Mobile:
□ Android AAB uploaded to Play Store
□ iOS build validated in App Store Connect
□ Capacitor config updated with production URL
□ Both app stores have proper screenshots + description
□ Deep links configured (voicecart:// or https://voicecart.app)

Business:
□ Payment gateway (Razorpay) in live mode
□ Pricing correct: ₹49/credit, ₹499/month Pro
□ First ad free logic verified
□ Refund policy posted on website
□ Privacy policy page exists (required for app stores)
□ Terms of service page exists

Analytics:
□ Google Analytics 4 or Plausible tracking
□ Razorpay dashboard showing payment events
□ Health endpoint monitoring set up
□ Error tracking (Sentry) capturing production errors
□ BullMQ dashboard accessible for queue monitoring

Go-live:
□ DNS propagated (check with whatsmydns.net)
□ SSL certificate valid (check with ssllabs.com)
□ All forms functional (register, login, record, pay)
□ End-to-end test: phone → OTP → record → process → pay → download
```

---

### Phase 5: Marketing & Launch (Day 5-14)

#### 5.1 Pre-Launch
1. **Beta testing** — Get 5-10 real Indian small business owners to test
   - Share via WhatsApp groups, local business communities
   - Focus: Does the voice recording work? Is Hindi copy useful?
   - Fix any UX issues before public launch

2. **Content creation**
   - Demo video (record a real ad, show the full flow)
   - Hindi-language promotional content for Instagram/YouTube
   - WhatsApp Business catalog content

3. **SEO setup**
   - Submit sitemap to Google Search Console
   - Set up Open Graph + Twitter Card meta tags (check current `app/page.tsx`)
   - Add `robots.txt`

#### 5.2 Launch Channels

| Channel | Approach | Expected Output |
|---------|----------|-----------------|
| WhatsApp Business | Share demo video in local business groups | High intent, local reach |
| Instagram Reels | Show before/after: voice → ad content | Viral potential |
| YouTube Shorts | Same demo video format | Discovery, trust |
| Google Ads | "Create ad from voice" keyword targeting | Paid acquisition |
| LinkedIn | Post about the product for founder community | Credibility, B2B leads |
| Product Hunt | Launch day submission | Early adopters, press |
| Reddit (r/india, r/startups) | Thoughtful post about Indian SMB marketing | Community feedback |

#### 5.3 Pricing Page Optimization
The `/subscription` page needs:
- Clear free vs ₹49 vs ₹499/month comparison table
- Example: "1 ad = ₹49. 10 ads/month = ₹299 with Pro"
- Trust signals: Razorpay secure badge, no hidden fees
- FAQ section: How does the free ad work? What languages? How long does processing take?

---

## 5. Feature Roadmap

### Launch Features (MVP)
Everything in the current codebase is launch-ready.

### Post-Launch v1.1 (Weeks 2-4)
| Feature | Impact | Effort |
|---------|--------|--------|
| Real-time ad status (SSE/WebSocket) | Removes polling, better UX | Medium |
| Pro user rate limit bypass | Monetization, reduces friction for paying users | Low |
| WhatsApp share with deep link prefill | Viral distribution | Low |
| Admin dashboard (basic) | See who signed up, basic metrics | Medium |

### Post-Launch v1.2 (Weeks 4-8)
| Feature | Impact | Effort |
|---------|--------|--------|
| Video rendering upgrade (Remotion/Shotstack) | Much better 9:16 video quality | High |
| Multi-language UI | Expand beyond Hindi-speaking users | Medium |
| Instagram Reels direct publish | Higher engagement, stickiness | High |
| Analytics dashboard for Pro users | Retention + upsell | Medium |
| Bulk ad creation (multiple products) | Power user retention | Medium |

### Post-Launch v2.0 (Months 2-3)
| Feature | Impact | Effort |
|---------|--------|--------|
| Campaign management (multiple ads) | Higher LTV, professional tool | High |
| Brand kit (logo, colors, fonts) | Consistency, stickiness | High |
| A/B testing ad copy variants | Performance improvement | Medium |
| Zapier/Make.com integration | Automation for power users | Medium |
| White-label for agencies | B2B revenue stream | High |

---

## 6. Cost Structure

### Monthly Operating Cost

| Service | Usage Tier | Monthly Cost |
|---------|-----------|--------------|
| Hosting (app + worker) | Starter | $10-20 |
| PostgreSQL | Managed, starter | $5-15 |
| Redis | Managed, starter | $5-10 |
| OpenAI | ~500 ads/month | $10-30 |
| ElevenLabs | ~500 voiceovers | $5-20 |
| Cloudinary | ~500 uploads | $5-15 |
| MSG91 OTP | ~500 SMS | $5-15 |
| Razorpay | Transaction fees only | 2% per transaction |
| Google Play Developer | One-time | $3 (one-time) |
| Apple Developer | Annual | $99/year = ~$8/month |
| Domain | Annual | ~$10/month |
| **Total** | | **~$60-140/month** |

### Revenue Targets
- 100 free users/month → 10 convert to paid (10% conversion) → ₹4,900 MRR
- 500 free users/month → 50 convert → ₹24,500 MRR
- Breakeven at ~50 paying users/month at ₹499

---

## 7. Technical Decisions to Make Now

### Decision 1: Hosting Provider
**Recommendation: Railway** for fastest time-to-market.

If you want to minimize cost long-term: **DigitalOcean App Platform** after validating product-market fit.

### Decision 2: Redis Provider
**Upstash Redis** (serverless, pay-per-request) vs **Railway Redis** (simple, fixed price).

Recommendation: Start with **Railway Redis** for simplicity. Switch to **Upstash** when you hit scale.

### Decision 3: Database Provider
**Neon** (serverless Postgres, generous free tier, branches) vs **Supabase** (more features, larger free tier).

Recommendation: **Neon** — better for this use case (small writes, occasional reads).

### Decision 4: Mobile Strategy
Current: Capacitor wrapping Next.js in WebView.

Options:
- **A) Keep Capacitor WebView** (cheapest, fastest) — App is just a browser pointing to your web app
- **B) Native shells** (React Native rewrite) — Better UX, much more work
- **C) PWA only** — No app store presence, but lowest maintenance

Recommendation: **A first, B later** — Ship as WebView now (weeks, not months), evaluate native rewrite if UX feedback warrants it.

### Decision 5: Payment Flow
Current: Razorpay one-time credits + Pro subscription.

Verify with real users: Is ₹49/ad the right price? Should it be ₹99? Should it be subscription-only?

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OpenAI API costs spiral | Medium | High | Set hard budget limits in OpenAI dashboard; add caching |
| Video rendering quality poor | High | High | Ship Cloudinary URL composition; plan Remotion upgrade |
| Low SMB adoption rate | Medium | High | Beta test with 10 real users before full launch |
| OTP delivery failures (MSG91) | Medium | Medium | Have fallback: email login option ready |
| Play Store rejection | Low | Medium | Use generic app description, no exaggerated claims |
| App Store rejection (audio recording) | Medium | Medium | Note microphone usage in store listing; explain value |
| User drops off during recording | High | Medium | Show progress bar, keep recording under 30 seconds |
| User drops off waiting for processing | High | Medium | Show real-time status + ETA; target <60 seconds |

---

## 9. Immediate Action Items (Priority Order)

```
Day 0 (Before anything else):
□ Rotate ALL secrets (JWT, CRON, API keys) — security first
□ Add .env to .gitignore
□ Update .env.example to have zero real values
□ Remove server.url from capacitor.config.ts

Day 0-1 — Staging:
□ Set up Railway project with Postgres + Redis
□ Deploy to staging with real API keys
□ Verify /api/health returns 200
□ Test full flow: register → OTP → record → process → preview
□ Configure Razorpay webhook to staging URL
□ Test payment with Razorpay test mode

Day 1-2 — Mobile:
□ Build Android APK: npm run build && npx cap sync android && ./gradlew assembleRelease
□ Create Play Store screenshots (4-5 images)
□ Set up Google Play Developer account ($25)
□ Build iOS: npx cap sync ios → open Xcode → archive
□ Create App Store Connect listing

Day 2-3 — Production:
□ Provision production infrastructure
□ Point domain to production
□ Deploy with production secrets
□ Set up Sentry error tracking
□ Run full E2E test in production

Day 3-5 — Launch:
□ Submit Android AAB to Play Store
□ Upload iOS build to App Store Connect
□ Write App Store descriptions
□ Recruit 5-10 beta testers from target audience
□ Fix issues from beta testing
□ Go live on Product Hunt
□ Announce on WhatsApp/Instagram/LinkedIn
```

---

## 10. Files to Create Before Launch

| File | Purpose |
|------|---------|
| `IMPLEMENTATION.md` | This file — full deployment roadmap |
| `CLAUDE.md` | Update to reflect current state |
| `docs/PRIVACY.md` | Privacy policy (required for app stores) |
| `docs/TERMS.md` | Terms of service |
| `.env.production` | Template for production env vars |
| `.github/workflows/production-deploy.yml` | GitHub Actions deploy pipeline |

---

*Last updated: Fri Jul 03 2026*
*Next review: After staging deployment is verified*