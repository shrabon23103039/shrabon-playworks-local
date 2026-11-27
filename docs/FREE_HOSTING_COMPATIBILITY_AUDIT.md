# Zero-Cost Production Hosting Compatibility Audit — Shrabon Playworks

**Audit Date:** 2026-11-27  
**Scope:** Static source-code and configuration audit against zero-cost (`$0`) hosting candidates (`Cloudflare Workers + OpenNext`, `Render Free`, `Neon Free`, `Cloudflare R2`, `Cloudflare Pages/Workers`).  
**Constraints Respected:** No source code modified, no provider accounts/databases created, no deployment performed, no payment details requested or entered.

---

## Executive Verdict

| Subsystem | Proposed Candidate | Technical Compatibility | Zero-Cost / No-Card Viability | Production Readiness |
|---|---|---|---|---|
| **Next.js Portal** (`apps/web`) | Cloudflare Workers + OpenNext | **Conditional** (requires OpenNext adapter + config tweaks) | **Yes** (`$0`, no card for Workers Free) | **Medium Risk** — every page uses `await connection()` (SSR) + `proxy.ts` CSP nonces, risking the **10 ms CPU/request** Workers Free cap |
| **Express API** (`apps/api`) | Render Free Web Service | **Compatible** (Node 24, `argon2` native addon builds on Linux) | **Yes** (`$0`, no card for Free Web Service) | **Rejected for Production** — Render docs explicitly prohibit Free instances for production; **15-min sleep + 30–60s cold starts** break portal UX & wipe in-memory rate limits |
| **PostgreSQL** (`pg`) | Neon Free | **Compatible** (`pg.Pool` + `DB_SSL=true`) | **Yes** (`$0`, permanent Free, no card) | **Conditional** — 5-min scale-to-zero, 100 CU-hours/mo, **no automated scheduled backups/snapshots** |
| **Game Origin** (`apps/game-origin`) | Cloudflare Pages + Functions | **Compatible** (`wrangler.toml` + `functions/` already built) | **Yes** (`$0`, no card for Pages/Workers Free) | **Incomplete Asset Gap** — `apps/game-origin/public/` only has `404.html`; built-in `/games/meteor-dash` and `/games/orbit-memory` live in `apps/games/public/games/` and must be included with matching CSP headers |
| **Object Storage** (`S3GameAssetStorage`) | Cloudflare R2 (Standard Free) | **Compatible** (`@aws-sdk/client-s3`, `forcePathStyle: true`) | **BLOCKED (Card Required)** — R2 checkout requires a payment method on file even for the 10 GB free tier | **Blocked by Owner Constraint** ("No credit card details") |

> **Bottom Line:** A strictly `$0` + **zero-credit-card** production deployment of the current architecture is **blocked** on two fronts:
> 1. **Cloudflare R2 requires a payment method on file** to activate, even though the 10 GB / 1M Class A / 10M Class B monthly allowance is `$0`.
> 2. **Render Free** sleeps after 15 minutes (causing 30–60s cold starts on every homepage load because `/api/v1/*` is proxied to the API) and is explicitly documented by Render as unsuitable for production.

---

## 1. Compatibility of Each Existing Application

### A. Next.js Frontend (`apps/web`) — Cloudflare Workers with OpenNext
**Inspected files:** `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/src/proxy.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/lib/api.ts`.

- **Framework & Dependencies:**
  - Uses `next@16.4.6`, `react@19.3.1`, `lucide-react@1.71.0`, `@fontsource/noto-sans-bengali@5.3.0`, `dotenv@16.6.1`.
  - No `next/image` usage anywhere in `apps/web/src/`; game artwork renders via inline `<svg>` (`GameArtwork`).
- **Routes, Middleware (`proxy.ts`), & Server Components:**
  - Uses Next.js 16 `proxy.ts` (`export function proxy(request: NextRequest)`) to generate per-request `crypto.randomUUID()` CSP nonces (`'nonce-...' 'strict-dynamic'`, `frame-src 'self' ${gameOrigin}`).
  - `apps/web/src/app/layout.tsx` calls `await connection()`, forcing **dynamic SSR on every page route** (15/18 routes are dynamic `ƒ`).
  - `apps/web/next.config.ts` defines `rewrites()` mapping `/api/:path*` → `${API_INTERNAL_ORIGIN}/api/:path*`, and `headers()` setting `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`.
- **OpenNext Compatibility & Required Configuration Changes:**
  - `@opennextjs/cloudflare` supports Next.js 16 App Router, `proxy.ts`, dynamic SSR, and `rewrites()` under `nodejs_compat`.
  - **Required changes (not yet present):**
    1. Add `@opennextjs/cloudflare` and `wrangler` configuration (`open-next.config.ts`, `wrangler.jsonc` with `nodejs_compat`).
    2. Guard or remove `dotenv.config({ path: resolve(process.cwd(), "../../.env") })` in `next.config.ts` so production builds/runtime read Worker environment variables (`API_INTERNAL_ORIGIN`, `NEXT_PUBLIC_GAME_ORIGIN`, `NEXT_PUBLIC_SITE_ORIGIN`) rather than a monorepo `.env` file.
    3. Set `images: { unoptimized: true }` in `next.config.ts` (safe since `next/image` is unused).
- **Risk on Workers Free:**
  - **10 ms CPU/request limit:** Because `RootLayout` calls `await connection()`, every page view executes React 19 SSR + `proxy.ts` nonce injection on the Worker. Uncached SSR cold starts can hit the 10 ms CPU cap.
  - **Proxy latency + subrequest coupling:** Every browser call to `/api/v1/*` hits the Next.js Worker rewrite first, then waits on the Express API. When Render Free is asleep (30–60s), the proxy fetch may time out or exceed Worker wall-clock limits.

### B. Express API (`apps/api`) — Render Free Web Service
**Inspected files:** `apps/api/package.json`, `apps/api/src/server.ts`, `apps/api/src/env.ts`, `apps/api/src/db.ts`, `apps/api/src/security.ts`.

- **Startup & Health:**
  - Build: `npm run build --workspace @playworks/api` (`tsc -p tsconfig.json`).
  - Start: `node dist/server.js` (note: `server.ts` reads `process.env.API_PORT`, whereas Render injects `PORT` — a Render start command or env mapping `API_PORT=$PORT` is required).
  - Health endpoint: `GET /api/v1/healthz` (runs `SELECT 1` and checks `retentionHealthy`).
- **Native Addons & Runtime:**
  - Uses `argon2@0.45.2` (native C++ binding), `express@5.3.0`, `pg@8.23.1`, `@aws-sdk/client-s3@3.1165.0`, `yauzl@3.4.0`. Runs natively on Render's Linux Node 24 runtime.
- **CORS, Origin & Cookie Security:**
  - `server.ts` enforces `cors({ origin: config.WEB_ORIGIN, credentials: true })`, `requireSameOrigin` (`request.get("origin") !== config.WEB_ORIGIN`), `requireCsrf`, and `app.set("trust proxy", config.NODE_ENV === "production" ? 1 : false)`.
  - `security.ts` sets `sp_session` (`HttpOnly; Path=/; SameSite=Strict; Secure`) and `sp_csrf` (`Path=/; SameSite=Strict; Secure`), host-only (no `Domain` attribute).
  - Because `apps/web` proxies `/api/:path*` to `apps/api`, cookies are stored on the portal origin (`*.workers.dev`) and `WEB_ORIGIN` must equal that exact `https://...` origin.
- **Render Free Operational Issues:**
  - **15-minute auto-sleep & 30–60s cold starts:** Homepage (`/`) fetches `/api/v1/categories` and `/api/v1/games` immediately on mount; when Render is sleeping, visitors see API load errors or 30–60s stalls.
  - **In-memory rate limiting (`express-rate-limit`):** `adminLimit` (8/15m), `contactLimit` (5/1h), and `gameUploadLimit` (6/15m) reset every time the Render container sleeps or restarts.
  - **24h `setInterval` retention timer:** Suspended while sleeping (though startup cleanup at `server.ts` lines 903–905 runs on each wake).
  - **Ephemeral filesystem:** Safe for published assets only when `GAME_STORAGE_DRIVER=s3` (enforced by `env.ts` in `production`), and ZIP uploads fit within 512 MB RAM / `/tmp`.

### C. PostgreSQL (`pg`) — Neon Free
**Inspected files:** `apps/api/src/db.ts`, `apps/api/src/scripts/migrate.ts`.

- **Driver & SSL Compatibility:**
  - `db.ts` uses `pg.Pool` with `max: Number(process.env.DB_POOL_MAX ?? 5)`, `idleTimeoutMillis: 10_000`, `connectionTimeoutMillis: 5_000`, and `ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined`.
  - Fully compatible with Neon PostgreSQL (`?sslmode=require` / `DB_SSL=true`).
  - **Pooler / Timeout Note:** `max: 5` is well within Neon's connection limits. However, `connectionTimeoutMillis: 5_000` is tight for Neon Free's **5-minute scale-to-zero** wake-up (~0.5–3s, occasionally longer on cold compute); raising `connectionTimeoutMillis` or adding retry logic is recommended if approved.
- **Migrations, Data Transfer & Backups:**
  - **Migrations:** Run `npm run db:migrate --workspace @playworks/api` from a secure local/CI shell against Neon's direct (non-pooler) connection string.
  - **Safe Data Transfer:** Use `pg_dump --no-owner --no-acl` on existing data (only if migrating existing records) and `pg_restore` / `psql` into Neon; never copy local `.env` secrets into the repo.
  - **Backup/Recovery Gap:** Neon Free provides only a **6-hour history window**, **1 manual snapshot**, and **no automated scheduled snapshots**. Automated backups require an external scheduled `pg_dump` (e.g., GitHub Actions) or a paid Neon plan.

### D. Dedicated Game Origin (`apps/game-origin`) — Cloudflare Pages + Functions
**Inspected files:** `apps/game-origin/wrangler.toml`, `apps/game-origin/src/serve.ts`, `apps/game-origin/functions/packages/[[path]].ts`, `apps/game-origin/functions/preview/[[path]].ts`.

- **Architecture & Security Controls:**
  - Already written for **Cloudflare Pages Functions** (`functions/packages/[[path]].ts` → `"published"` reading `packages/<uuid>/...`; `functions/preview/[[path]].ts` → `"preview"` reading `staging/<uuid>/...` with HMAC-SHA256 `PREVIEW_TOKEN_SECRET` validation).
  - Preserves `MAIN_SITE_ORIGIN` in `Content-Security-Policy: frame-ancestors ${siteOrigin}`, `connect-src 'none'`, `script-src 'self'`, `Cross-Origin-Resource-Policy: cross-origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `playworks.json` blocking.
  - Portal `<iframe>` keeps `sandbox="allow-scripts"`.
  - Drafts (`staging/`) cannot be read via `/packages/*` (returns 404).
- **Critical Gap Found in Code:**
  - `apps/game-origin/public/` currently contains **only `404.html`**.
  - The two built-in games (`/games/meteor-dash/index.html` and `/games/orbit-memory/index.html`) currently reside in `apps/games/public/games/`, not `apps/game-origin/public/`.
  - Before deploying `apps/game-origin` to Cloudflare Pages, `apps/games/public/games/` must be copied into `apps/game-origin/public/games/` (or uploaded to R2 under a different route) **with a Cloudflare Pages `_headers` file** applying the same `frame-ancestors`, `connect-src 'none'`, `nosniff`, and `Referrer-Policy` headers to `/games/*`.
  - Note: Requests to `/packages/*` and `/preview/*` invoke Pages Functions and count toward the **100,000 requests/day & 10 ms CPU** Workers Free quota; static `/games/*` assets on Pages do not consume Function invocations.

### E. Object Storage (`S3GameAssetStorage`) — Cloudflare R2
**Inspected files:** `apps/api/src/game-storage.ts`, `apps/api/src/game-assets.ts`, `apps/api/src/server.ts`.

- **R2 S3 Compatibility:**
  - Uses `@aws-sdk/client-s3` with `forcePathStyle: true` and `region: "auto"`.
  - Uses `PutObjectCommand` (`staging/<id>/<path>`), `ListObjectsV2Command`, `CopyObjectCommand` (`staging/<id>/...` → `packages/<id>/...`), `GetObjectCommand`, and `DeleteObjectsCommand`.
  - Fully compatible with Cloudflare R2's S3 API (`https://<account-id>.r2.cloudflarestorage.com`).
  - Preserves immutable revision keys (`packages/<asset_id>/...`), atomic cleanup on partial publish/stage failure, unpublish (`deletePrefix`), and rollback (`publishGamePackage` for historical `revision.asset_id`).
- **Hard Blocker (Payment Method):**
  - Cloudflare R2 is a metered service; **enabling R2 in the Cloudflare dashboard requires adding a valid credit card or billing profile**, even though monthly usage under 10 GB-month storage / 1M Class A / 10M Class B / zero egress costs `$0`.

---

## 2. Exact Provider Mapping & Required Configuration

| Component | Target Provider | Subdomain Pattern | Required Environment / Bindings |
|---|---|---|---|
| **Web Portal** (`apps/web`) | Cloudflare Workers (OpenNext) | `https://playworks-web.<sub >.workers.dev` | `API_INTERNAL_ORIGIN`, `NEXT_PUBLIC_SITE_ORIGIN`, `NEXT_PUBLIC_GAME_ORIGIN` |
| **Express API** (`apps/api`) | Render Free Web Service | `https://playworks-api.onrender.com` | `NODE_ENV=production`, `API_PORT=$PORT`, `WEB_ORIGIN`, `DATABASE_URL`, `DB_SSL=true`, `GAME_STORAGE_DRIVER=s3`, `GAME_STORAGE_S3_ENDPOINT`, `GAME_STORAGE_S3_REGION=auto`, `GAME_STORAGE_S3_BUCKET`, `GAME_STORAGE_S3_ACCESS_KEY_ID`, `GAME_STORAGE_S3_SECRET_ACCESS_KEY`, `GAME_PREVIEW_TOKEN_SECRET` (>=32 chars), `SESSION_TTL_HOURS=12`, optional `RESEND_API_KEY` / `CONTACT_FROM` / `CONTACT_TO` |
| **Database** (`playworks`) | Neon Free | `ep-<id>.<region>.aws.neon.tech` | Separate migration/runtime roles recommended; `?sslmode=require` |
| **Game Origin** (`apps/game-origin`) | Cloudflare Pages | `https://shrabon-playworks-games.pages.dev` | R2 binding `GAME_ASSETS`, `MAIN_SITE_ORIGIN`, secret `PREVIEW_TOKEN_SECRET` (must match `GAME_PREVIEW_TOKEN_SECRET`) |
| **Asset Storage** | Cloudflare R2 (Standard) | Private bucket only (no `r2.dev`) | Private bucket `shrabon-playworks-game-assets` + scoped R2 API token for Express API |

---

## 3. Free-Tier Limitations & Estimated Operational Capacity

| Provider | Free Limits (Rechecked 2026-11-27) | Card Required? | Over-Limit Behavior | Estimated Capacity for Shrabon Playworks |
|---|---|---|---|---|
| **Cloudflare Workers Free** (Portal) | 100,000 req/day, **10 ms CPU/req**, 128 MB RAM, 50 subrequests/req | No | Requests throttled/rejected (no charges) | ~5,000–20,000 page views/day if SSR stays <10 ms CPU; **CPU cap is the primary bottleneck** |
| **Cloudflare Pages + Functions** (Game Origin) | Static assets unlimited; Functions share Workers Free (100,000 req/day, 10 ms CPU) | No | Functions throttled at 100k/day | Built-in games (`/games/*`) unlimited; uploaded ZIP packages share 100k req/day |
| **Cloudflare R2** (Standard Free) | 10 GB-month storage, 1M Class A/mo, 10M Class B/mo, **$0 egress** | **Yes** (required to enable R2) | **Billed** beyond free allowance | Hundreds of small HTML5 games & millions of asset reads/mo within free tier |
| **Render Free** (Express API) | 750 hrs/mo, 512 MB RAM, 0.1 CPU, **sleeps after 15 min idle**, ephemeral disk | No | Bandwidth overage suspends service (no card) | **Unsuitable for production**; 30–60s cold starts after any 15-min quiet period |
| **Neon Free** (PostgreSQL) | 100 CU-hours/mo, 1 GB storage, 5 GB egress/mo, **5-min scale-to-zero**, 6h history, 1 manual snapshot | No | Compute/writes pause until next cycle (no charges) | Easily supports 2–50 games & low/moderate traffic within 100 CU-hours/mo (~3h/day active compute) |

---

## 4. Security Risks & Unsupported Requirements

1. **No-Card Constraint vs. Cloudflare R2:** R2 cannot be provisioned without a payment method on file. There is no zero-card S3-compatible R2 alternative configured in this architecture without introducing another provider account (e.g., Supabase Storage / Backblaze B2, which also have their own card/egress/S3 quirks).
2. **`workers.dev` & Render Free Production Policy:** Cloudflare documents `workers.dev` for non-business-critical/hobby use; Render explicitly states not to use Free instances for production.
3. **In-Memory Rate Limiting on Render Free:** Container sleep/restart clears `express-rate-limit` counters, weakening admin login brute-force and contact-form spam protection.
4. **No Automated DB Backups on Neon Free:** Only 1 manual snapshot and 6h PITR exist; accidental data loss >6 hours cannot be recovered without external `pg_dump` backups.
5. **Missing Built-In Game Assets in `apps/game-origin/public/`:** Deploying `apps/game-origin` as-is will 404 on `/games/meteor-dash/index.html` and `/games/orbit-memory/index.html`.
6. **Email Contact Delivery (`RESEND_API_KEY`):** Unconfigured unless the owner provides a Resend account and verified sender domain/address (optional in `env.ts`, but contact form submissions will return unconfigured error without it).

---

## 5. Final Recommendation

- **Do NOT deploy this stack to production under the current strict `$0 + no-credit-card` constraints** without owner acknowledgment of the blockers below:
  1. **R2 requires a credit card** to activate (even at `$0` usage). If strictly zero card is non-negotiable, an alternative free S3-compatible object store that does not require a card must be selected and tested, OR the owner must authorize adding a card for R2 with usage alerts.
  2. **Render Free is not production-grade** due to 15-minute auto-sleep (30–60s cold starts) and ephemeral rate-limit resets. For a real public portal, either a non-sleeping free/low-cost Node host or an architecture review (moving API endpoints to a serverless runtime with durable rate limiting) is needed.
  3. **OpenNext on Workers Free** must be benchmarked against the **10 ms CPU limit** (consider removing unnecessary `await connection()` on public pages that don't need per-request nonce SSR if CPU exceeds 10 ms, or carefully profiling SSR latency).

---

## 6. Step-by-Step Deployment Plan (Pending Owner Approval & Blockers)

1. **Owner Resolves Blockers & Creates Accounts:**
   - Decide on Cloudflare R2 billing profile (card required for `$0` tier) or alternative S3 provider.
   - Create owner-controlled Cloudflare, Neon, and Render (or approved API host) accounts.
2. **Prepare Code & Config (Only After Approval):**
   - Add OpenNext Cloudflare config (`open-next.config.ts`, `wrangler.jsonc`, guard `dotenv` in `next.config.ts`, `images: { unoptimized: true }`).
   - Copy `apps/games/public/games/` into `apps/game-origin/public/games/` and add `apps/game-origin/public/_headers` with matching CSP `frame-ancestors` + security headers.
   - Map `API_PORT=$PORT` for Render startup and verify `connectionTimeoutMillis` for Neon cold-wake.
3. **Provision Infrastructure & Secrets:**
   - Provision Neon database, create least-privilege runtime role, run `db:migrate`, `db:seed`, and `admin:bootstrap` from a secure shell.
   - Provision private R2 bucket (`shrabon-playworks-game-assets`) and scoped S3 API token.
   - Deploy `apps/game-origin` to Cloudflare Pages with `GAME_ASSETS` binding, `MAIN_SITE_ORIGIN`, and `PREVIEW_TOKEN_SECRET`.
   - Deploy `apps/api` with `NODE_ENV=production`, `GAME_STORAGE_DRIVER=s3`, and matching `WEB_ORIGIN` + `GAME_PREVIEW_TOKEN_SECRET`.
   - Deploy `apps/web` via OpenNext to Cloudflare Workers with `API_INTERNAL_ORIGIN`, `NEXT_PUBLIC_SITE_ORIGIN`, and `NEXT_PUBLIC_GAME_ORIGIN`.
4. **Post-Deploy Verification:**
   - Verify `/api/v1/healthz`, draft isolation (`/packages/*` returns 404 for drafts), signed preview, admin login/CSRF, publish/rollback/unpublish, and `sandbox="allow-scripts"` iframe isolation.

---

## 7. Clear Blockers Requiring Owner Approval

1. **Credit Card Requirement for Cloudflare R2:** Confirm whether you approve linking a payment method solely to unlock R2's `$0` free tier, or prefer evaluating an alternative no-card S3-compatible provider.
2. **Render Free Cold Starts & Production Policy:** Confirm whether 30–60s cold starts after 15 minutes of inactivity are acceptable for initial temporary-subdomain testing, or if a non-sleeping API host is required before launch.
3. **Neon Free Backup Strategy:** Approve an external scheduled `pg_dump` backup workflow (e.g., private GitHub Actions) since Neon Free lacks automated scheduled snapshots.
4. **OpenNext & Asset Packaging Code Changes:** Authorize the small config/asset-copy edits (`open-next.config.ts`, `next.config.ts`, `apps/game-origin/public/games/`) when ready to proceed.
