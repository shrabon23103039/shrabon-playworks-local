# Second-Stage Alternative-Provider Audit — Zero-Cost & No-Card Constraints

**Audit Date:** 2026-11-27  
**Prerequisites Read:** `docs/FREE_HOSTING_COMPATIBILITY_AUDIT.md`, `apps/web/`, `apps/api/`, `apps/game-origin/`.  
**Strict Constraints:** Total budget `৳0`, **no payment card/method**, temporary provider subdomains acceptable, no paid trials, **no architecture changes** (preserve Next.js, Express API, PostgreSQL, isolated game origin, S3 storage abstraction, auth, security, and publishing workflow).  
**Scope:** Research and documentation only. No code modified, no accounts or databases created, no deployment performed.

---

## Executive Summary

| Research Area | Qualifying No-Card, No-Sleep, Production-Ready Option Found? | Verdict |
|---|---|---|
| **1. Express API Hosting (no sleep, no production restriction, no card)** | **NO** | **No qualifying provider found.** Every free Node.js/container host either sleeps on idle (Render, Railway, Leapcell), requires a credit card (Koyeb, Northflank, Fly.io ongoing, Oracle/AWS/GCP), or disallows general free Docker apps (Hugging Face Spaces). |
| **2. S3-Compatible Storage (no payment method)** | **Partial (Backblaze B2)** | **Backblaze B2** offers 10 GB free S3-compatible storage with **no credit card required** and no sleep, **but** `apps/game-origin` uses a Cloudflare `R2Bucket` binding (`env.GAME_ASSETS`), not S3 HTTP fetches—so using B2 requires either adding S3 SigV4 reads in `apps/game-origin` or proxying through `apps/games`. |
| **3. Next.js Hosting (Workers/OpenNext CPU & no-card alternatives)** | **Conditional (Workers Free / Netlify Free)** | **Cloudflare Workers Free** (no card) risks hitting the **10 ms CPU/request** limit because `RootLayout` uses `await connection()` (SSR on every route). **Netlify Free** (no card, commercial allowed) avoids the 10 ms CPU wall but hard-caps total monthly usage at **300 credits/month** (pausing when exhausted). |
| **4. Neon Free Backup & Recovery Alternatives** | **Partial (GitHub Actions `pg_dump` + Neon Free)** | **Aiven Free** includes automated backups without a card, **but powers off on inactivity** (manual restart required). **Supabase Free** pauses after 7 days of inactivity and lacks free automated backups. **Best no-card mitigation:** Keep Neon Free + add an external scheduled `pg_dump` workflow (e.g., GitHub Actions Free). |

---

## 1. Express API Hosting Alternatives (No Sleep, No Card, No Production Restrictions)

| Provider | Free Limits | Card Required? | Sleep / Suspension Behavior | Production Restrictions | Technical Compatibility (`apps/api`) | Security Implications | Important Limitations |
|---|---|---|---|---|---|---|---|
| **Render Free** *(baseline)* | 750 hrs/mo, 512 MB RAM, 0.1 CPU, ephemeral disk | **No** | **Sleeps after 15 min idle**; 30–60s cold starts | **Explicitly prohibited** for production in Render docs | Compatible (Node 24 + `argon2` native addon) | **In-memory `express-rate-limit` resets on sleep**, weakening brute-force protection | 24h `setInterval` retention timer suspended while asleep |
| **Koyeb Free** | 1 web service, 512 MB RAM, 0.1 vCPU, 2 GB NVMe | **Yes** (`$29` pre-auth hold) | **Sleeps after 1 hr idle** (1–5s wake) | Hobby/testing | Compatible (Docker / Node) | Fails no-card rule; rate limits reset on sleep | Only Frankfurt / Washington D.C. regions |
| **Northflank Sandbox** | 2 services, 1 DB, 2 cron jobs | **Yes** (card required for anti-abuse validation) | **Always-on** (does not sleep) | Sandbox/testing | Compatible (Docker / Node) | Fails no-card rule | Strict sandbox CPU/RAM caps |
| **Fly.io** | `$1` trial credit for 7 days (no card); `$5/mo` waived usage **with card** | **Yes** for ongoing use (`7-day` limit without card) | Trial instances auto-stop after 5 min | Ongoing free tier requires card | Compatible | Fails no-card & no-trial rule | Trial expires after 7 days without a card |
| **Railway Free** | `$5` 30-day trial, then **`$1/mo` permanent free credit** | **No** | **Sleeps after 5–10 min** outbound inactivity | Hobby/experimentation | Compatible | In-memory rate limits reset on sleep | `$1/mo` credit insufficient for continuous Express + `argon2` traffic |
| **Leapcell** | Free serverless container tier | **No** (minimal onboarding) | **Scales to zero / sleeps on idle** (cold starts) | Serverless container model | Compatible in principle, unverified with `argon2` | In-memory `express-rate-limit` resets on scale-to-zero; no persistent `setInterval` | Cold-start latency + stateless rate-limit loss |
| **Oracle Cloud / AWS / GCP** | Always Free VMs / Cloud Run | **Yes** (credit/debit card required for identity/billing) | Always-on (OCI VM) / scale-to-zero (Cloud Run) | Production-capable | Compatible | Fails no-card rule; risk of accidental overage charges if misconfigured | Strictly requires valid payment card |
| **Hugging Face Spaces** | Free ZeroGPU quotas; general Docker Spaces require PRO (`$9/mo`) | **Yes** for Docker Spaces | Runs continuously until quota | ML/AI demos only | **Not viable** for general Node Express API without PRO | Terms/intended use mismatch | Docker Space creation gated behind PRO |

**Verdict for Area 1:** **No qualifying provider found.** No provider currently offers an always-on, no-sleep, production-approved Express/Node.js runtime at `৳0` without requiring a payment card.

---

## 2. S3-Compatible Game Asset Storage Alternatives (No Payment Method)

| Provider | Free Limits | Card Required? | Sleep / Suspension Behavior | Production Restrictions | Technical Compatibility (`S3GameAssetStorage` & `apps/game-origin`) | Security Implications | Important Limitations |
|---|---|---|---|---|---|---|---|
| **Cloudflare R2** *(baseline)* | 10 GB-mo, 1M Class A, 10M Class B, `$0` egress | **Yes** (required at dashboard checkout to enable R2) | Always-on | Standard free tier is production-capable | 100% compatible with both `S3GameAssetStorage` and `apps/game-origin` `R2Bucket` binding | Private bucket + R2 binding keeps drafts strictly isolated | **Blocked by no-card requirement** |
| **Backblaze B2** | **10 GB storage always free**, free S3 API calls, **free egress up to 3× avg monthly storage** | **No** (email + password signup for standard free tier) | Always-on (does not sleep) | None for private storage under 10 GB; card needed only to scale past free limits / public buckets | `apps/api` `S3GameAssetStorage` is **compatible** (`PutObject`, `CopyObject`, `ListObjectsV2`, `GetObject`, `DeleteObjects`). **However, `apps/game-origin` uses `env.GAME_ASSETS.get()` (Cloudflare R2 binding)**, which **cannot read B2** without modifying `apps/game-origin` to sign S3 HTTP requests. | Private B2 buckets + scoped Application Keys (`keyID` / `applicationKey`) preserve draft isolation if `apps/game-origin` validates requests | Exceeding 3× monthly storage egress (e.g., 30 GB/mo if 10 GB stored) or 10 GB storage pauses/requires card |
| **Supabase Storage** | 1 GB storage, 50 MB max file, 5 GB/mo egress | **No** | **Entire project pauses after 7 days of inactivity** (manual dashboard resume required) | Prototyping / low-activity | Has an S3-compatible endpoint for `apps/api`, **not** compatible with `apps/game-origin` R2 binding | Pausing causes all game asset fetches & admin uploads to fail until manually resumed | 7-day inactivity pause is unacceptable for unattended hosting |

**Verdict for Area 2:** **Backblaze B2** is the only no-card, non-sleeping S3-compatible storage option for `apps/api`. However, **without modifying `apps/game-origin`**, Cloudflare Pages Functions cannot read from Backblaze B2 because `apps/game-origin/src/serve.ts` specifically expects a Cloudflare `R2Bucket` binding.

---

## 3. Next.js Hosting & Cloudflare Workers/OpenNext CPU Compatibility

| Provider | Free Limits | Card Required? | CPU / Execution Constraints | Production Restrictions | Technical Compatibility (`apps/web`) | Security Implications | Important Limitations |
|---|---|---|---|---|---|---|---|
| **Cloudflare Workers + OpenNext** *(baseline)* | 100,000 req/day, **10 ms CPU/req**, 128 MB RAM, 50 subrequests/req | **No** | **10 ms CPU/request** is a hard cap | `workers.dev` subdomain documented as personal/hobby, non-business-critical | Supports Next.js 16 + `proxy.ts` + `rewrites()`, **but** `RootLayout` calls `await connection()`, forcing **dynamic SSR on every request** | Per-request CSP nonces in `proxy.ts` preserved; host-only `Set-Cookie` must pass cleanly through `/api` rewrite | Complex/cold SSR pages can exceed 10 ms CPU and fail with Worker CPU limit errors |
| **Netlify Free** | **300 credits/month** hard cap (~15 GB bandwidth or ~20 production deploys at 15 credits/deploy + compute) | **No** | Serverless Function limits (10s+ wall clock; no 10 ms CPU cap) | **Commercial use explicitly permitted** | Supports Next.js 16 SSR, `proxy.ts`, and `rewrites()` via Netlify Next.js runtime | Preserves CSP headers & same-origin `/api` proxy | **Hard-cap pause:** Once 300 monthly credits are consumed, the site is paused until next month |
| **Vercel Hobby** | Generous SSR/edge limits | **No** | 10s serverless duration | **Strictly non-commercial / personal use only** | Native Next.js 16 support | Preserves CSP & rewrites | **Rejected** unless owner confirms purely personal non-commercial use |

**Verdict for Area 3:** **Cloudflare Workers Free** (no card) is technically usable only if SSR CPU stays under 10 ms per request (which is risky with `await connection()` on every page). **Netlify Free** (no card, commercial allowed) avoids the 10 ms CPU bottleneck but hard-pauses the site if 300 credits/month are exhausted.

---

## 4. Neon Free Database Backup & Recovery Alternatives

| Provider / Strategy | Free Limits | Card Required? | Sleep / Pause Behavior | Backup & Recovery Capability | Technical Compatibility (`pg`) | Important Limitations |
|---|---|---|---|---|---|---|
| **Neon Free** *(baseline)* | 100 CU-hours/mo, 1 GB storage, 5 GB egress/mo | **No** | Scales compute to zero after **5 min idle** (auto-wakes on connect) | **6-hour PITR history + 1 manual snapshot; NO automated scheduled backups** | Compatible (`DB_SSL=true`, `max: 5`); `5_000` ms connect timeout is tight on cold wake | Risk of data loss >6h without external backup |
| **Neon Free + GitHub Actions `pg_dump`** | GitHub Free: unlimited min (public) / 2,000 min/mo (private) | **No** | Neon wakes briefly for scheduled dump | **Automated daily/weekly logical backups** stored as private workflow artifacts (up to 90 days) or pushed to private B2 bucket | Fully compatible (`pg_dump` over `DATABASE_URL`) | Uses a small fraction of Neon's 100 CU-hours/mo & 5 GB egress |
| **Aiven Free PostgreSQL** | 1 GB storage, 1 CPU, 1 GB RAM, max 20 connections | **No** | **Powers off automatically after inactivity** (requires **manual console restart**) | **Includes automated backups & disaster recovery** | Compatible (`pg` + SSL), no connection pooler | **Unsuitable for unattended site** due to manual restart after inactivity power-off |
| **Supabase Free PostgreSQL** | 500 MB storage, 5 GB egress | **No** | **Pauses entire project after 7 days of inactivity** (manual resume) | **No automated backups on Free tier** | Compatible (`pg` + SSL) | Worse availability & backup posture than Neon Free |

**Verdict for Area 4:** **Neon Free + scheduled external `pg_dump` (GitHub Actions Free)** is the strongest zero-cost, no-card PostgreSQL + backup combination that does not require manual console restarts.

---

## 5. Honest Conclusion & Owner Decision Points

Because **zero-card + zero-sleep + unchanged architecture** has **no qualifying free host for the Express API** and **Cloudflare R2 requires a payment card**, a production-ready `৳0` deployment of the **unchanged** architecture is **currently blocked**.

To proceed, owner authorization is needed on one of the following paths:
1. **Path A (Accept Free-Tier Limitations for Non-Critical / Staging Use Only):**
   - Use **Netlify Free** or **Cloudflare Workers Free** (`apps/web`) + **Render Free** (`apps/api`, accepting 30–60s cold starts & ephemeral rate limits) + **Neon Free + GitHub Actions `pg_dump`** — *still blocked on R2 unless a card is added or `apps/game-origin` is authorized to read Backblaze B2 via S3 HTTP.*
2. **Path B (Authorize Card-Gated `$0` Tiers with Hard Safeguards):**
   - Provide a card only where required for `$0` identity/billing (e.g., **Cloudflare R2** free 10 GB + **Fly.io** `$5/mo` waived / **Northflank** Sandbox / **OCI Always Free**), **Wait:** this conflicts with your current *"No payment card"* rule.
3. **Path C (Authorize Architecture Adaptation in a Future Step):**
   - E.g., adapting `apps/game-origin` to fetch from Backblaze B2 via S3 SigV4 (eliminating R2's card requirement) and/or migrating `apps/api` routes to a no-card serverless runtime with durable DB-backed rate limiting (eliminating Render Free's 15-min sleep).
