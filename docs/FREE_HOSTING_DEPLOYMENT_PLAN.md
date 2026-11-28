# Zero-Cost Public Demo Deployment Plan — Shrabon Playworks

**Plan Date:** 2026-11-27  
**Baseline:** `https://github.com/shrabon23103039/shrabon-playworks-local` (`main`, tag `local-baseline-v1`, commit `b239b2f0b942a0b357234d0bd78204a5043ce4ea`)  
**Basis:** `docs/FREE_HOSTING_COMPATIBILITY_AUDIT.md`, `docs/FREE_HOSTING_ALTERNATIVES_AUDIT.md`, `docs/09_Deployment.md`  
**Mode:** Planning only — no source code edited, no accounts/databases created, no deployment executed.

---

## 0. Honest Feasibility Statement (Unresolved Blockers)

Under the strict constraints (**৳0 budget**, **no payment card/method**, **no architecture changes**):

1. **Production reliability is NOT achievable** at ৳0 without a card: every no-card Node.js host sleeps on idle (Render Free sleeps after 15 min with 30–60s cold starts and resets in-memory `express-rate-limit` counters).
2. **Uploaded ZIP game storage (`/packages/*`, `/preview/*`) has an unresolved no-card conflict:**
   - **Cloudflare R2** (`apps/game-origin`'s native `R2Bucket` binding) **requires a payment card** at dashboard checkout even for its `$0` free tier.
   - **Backblaze B2** (`10 GB` free, **no card**) is S3-compatible with `apps/api` (`S3GameAssetStorage`), **but** `apps/game-origin` currently reads via Cloudflare's `R2Bucket` binding (`env.GAME_ASSETS.get()`), not S3 HTTP requests.

### Safest Achievable Public Demo Stack (৳0, Zero Card)

| Layer | Selected Provider | Card Required? | Role in Public Demo |
|---|---|---|---|
| **PostgreSQL** | **Neon Free** (+ GitHub Actions `pg_dump`) | **No** | Persistent database + scheduled logical backups |
| **Express API** | **Render Free Web Service** | **No** | Demo API (accepts 15-min sleep & 30–60s cold starts) |
| **Web Portal** | **Cloudflare Workers Free (OpenNext)** *(fallback: Netlify Free)* | **No** | Next.js 16 portal + `/api/*` proxy + CSP nonces |
| **Game Origin** | **Cloudflare Pages + Functions** | **No** | Isolated `pages.dev` origin serving built-in HTML5 games |
| **Object Storage** | **Backblaze B2** *(requires small `apps/game-origin` S3 read adapter)* OR **Built-in games only** if `apps/game-origin` stays R2-only | **No** | Private `staging/` + `packages/` storage (see §5) |

---

## 1. Service-by-Service Deployment Specification

### Service 1: PostgreSQL — Neon Free (+ GitHub Actions Backups)

1. **Selected provider & why:** **Neon Free** — permanent `$0` tier, **no card required**, supports `pg@8.23.1` with TLS (`DB_SSL=true`), 5-min scale-to-zero, and instant branching.
2. **Exact free-tier limitations:** `100 CU-hours/month`, `1 GB` storage/project, `5 GB/month` public egress, `5-minute` inactivity scale-to-zero, `6-hour` PITR history, `1` manual snapshot, **no automated scheduled backups**.
3. **Card required:** **No**.
4. **Required environment variables (names only):**
   - Migration shell: `DATABASE_URL` (direct non-pooler Neon URI), `DB_SSL` (`true`)
   - Runtime API: `DATABASE_URL` (least-privilege runtime role), `DB_SSL` (`true`), `DB_POOL_MAX` (`5`)
5. **Required source-code changes:**
   - None required for compatibility (`apps/api/src/db.ts` already sets `ssl: { rejectUnauthorized: true }` when `DB_SSL === "true"` and `max: 5`).
   - *Recommended resilience tweak (if approved):* Increase `connectionTimeoutMillis` in `apps/api/src/db.ts` from `5_000` to `10_000` ms to tolerate Neon Free cold-compute wakeups.
   - Add a `.github/workflows/db-backup.yml` workflow running `pg_dump` on a schedule into private GitHub Actions artifacts (up to 90 days) to mitigate Neon Free's lack of automated snapshots.
6. **Deployment steps:**
   - Create Neon project (`playworks`), record direct connection string in local/CI secret store only.
   - Create separate least-privilege runtime role (`SELECT, INSERT, UPDATE, DELETE` on application tables, no `CREATE`/`DROP`).
   - Run `npm run db:migrate --workspace @playworks/api` and `npm run db:seed --workspace @playworks/api` once from a secure shell, followed by `npm run admin:bootstrap --workspace @playworks/api`.
7. **Health checks & acceptance tests:**
   - Verify `9` public tables and `schema_migrations` rows (`001_initial.sql`, `002_game_assets.sql`).
   - Verify `meteor-dash` and `orbit-memory` exist in `draft` status (or published only if explicitly desired for the public demo).
8. **Rollback procedure:**
   - Restore from Neon's 6-hour PITR / manual snapshot or re-import the latest GitHub Actions `pg_dump` artifact via `psql`.

---

### Service 2: Object Storage — Backblaze B2 (No-Card S3) vs. R2 Blocker

1. **Selected provider & why:** **Backblaze B2** is the only no-card, non-sleeping S3-compatible object store (`S3GameAssetStorage` in `apps/api/src/game-storage.ts` uses `@aws-sdk/client-s3` with `forcePathStyle: true`).
2. **Exact free-tier limitations:** `10 GB` storage always free, free S3 API calls, free egress up to **3× average monthly storage**. Exceeding limits pauses or requires a card.
3. **Card required:** **No** (for standard account + private bucket under 10 GB).
4. **Required environment variables (names only):**
   - `GAME_STORAGE_DRIVER` (`s3`)
   - `GAME_STORAGE_S3_ENDPOINT` (Backblaze B2 S3 endpoint URL)
   - `GAME_STORAGE_S3_REGION` (B2 bucket region, e.g. `us-west-004`)
   - `GAME_STORAGE_S3_BUCKET` (private bucket name)
   - `GAME_STORAGE_S3_ACCESS_KEY_ID` (B2 Application Key ID)
   - `GAME_STORAGE_S3_SECRET_ACCESS_KEY` (B2 Application Key)
5. **Required source-code changes (CRITICAL):**
   - **`apps/api`:** Zero code changes (`S3GameAssetStorage` already supports `PutObject`, `CopyObject`, `ListObjectsV2`, `GetObject`, `DeleteObjects`).
   - **`apps/game-origin`:** Currently reads `env.GAME_ASSETS.get(key)` (Cloudflare R2 binding). **To serve uploaded packages from Backblaze B2 without R2**, `apps/game-origin` must be authorized to add a small WebCrypto S3 SigV4 `fetch()` adapter reading from the private B2 bucket (`B2_S3_ENDPOINT`, `B2_BUCKET`, `B2_ACCESS_KEY_ID`, `B2_SECRET_ACCESS_KEY`).
   - *If no `apps/game-origin` code change is authorized:* Run the public demo with **built-in static games only** (`/games/meteor-dash/`, `/games/orbit-memory/`) and defer uploaded ZIP packages until R2 or the B2 adapter is approved.
6. **Deployment steps:**
   - Create private B2 bucket, generate a scoped Application Key restricted to that bucket, configure `apps/api` and `apps/game-origin` secrets.
7. **Health checks & acceptance tests:**
   - Upload a test ZIP in Admin → verify `staging/<uuid>/` is private (returns `404` on `/packages/<uuid>/index.html`) → verify signed `/preview/<uuid>/index.html?token=...` loads → publish → verify `/packages/<uuid>/index.html` loads → unpublish/rollback → verify `404`.
8. **Rollback procedure:**
   - Use Admin **Revisions → Rollback** to restore a prior `asset_id` revision; `S3GameAssetStorage` re-copies immutable `staging/<asset_id>/` keys into `packages/<asset_id>/`.

---

### Service 3: Express API — Render Free Web Service (Demo-Only)

1. **Selected provider & why:** **Render Free** — **no card required**, runs Node 24 natively (supports `argon2@0.45.2` native C++ addon without porting Express).
2. **Exact free-tier limitations:** `750 instance hours/month`, `512 MB` RAM, `0.1` CPU, **ephemeral disk**, **sleeps after 15 minutes of inactivity** (`30–60s` cold start on next request). **Not for production** per Render docs; in-memory `express-rate-limit` counters and the `24h` `setInterval` analytics timer reset on every sleep/wake.
3. **Card required:** **No**.
4. **Required environment variables (names only):**
   - `NODE_ENV` (`production`)
   - `API_PORT` (bound to Render's `PORT` via start command `API_PORT=$PORT node apps/api/dist/server.js`)
   - `WEB_ORIGIN` (exact portal origin, e.g. `https://<portal>.workers.dev`)
   - `DATABASE_URL`, `DB_SSL`, `DB_POOL_MAX`
   - `GAME_STORAGE_DRIVER`, `GAME_STORAGE_S3_ENDPOINT`, `GAME_STORAGE_S3_REGION`, `GAME_STORAGE_S3_BUCKET`, `GAME_STORAGE_S3_ACCESS_KEY_ID`, `GAME_STORAGE_S3_SECRET_ACCESS_KEY`
   - `GAME_PREVIEW_TOKEN_SECRET` (32+ chars)
   - `SESSION_TTL_HOURS` (`12`)
   - Optional (only if Resend sender verified): `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`
5. **Required source-code changes:**
   - None strictly required if start command sets `API_PORT=$PORT`, **or** optionally read `process.env.PORT ?? process.env.API_PORT` in `apps/api/src/env.ts`.
   - Note: `apps/api/src/env.ts` rejects `NODE_ENV=production` unless `GAME_STORAGE_DRIVER=s3` and S3 vars + `GAME_PREVIEW_TOKEN_SECRET` are set. (Even for a built-in-games-only demo, B2 credentials must be configured so `env.ts` passes production validation.)
6. **Deployment steps:**
   - Connect `shrabon23103039/shrabon-playworks-local` (`main`) to Render Web Service (Free tier).
   - Build command: `npm ci && npm run build --workspace @playworks/api`
   - Start command: `API_PORT=$PORT node apps/api/dist/server.js`
   - Health check path: `/api/v1/healthz`
7. **Health checks & acceptance tests:**
   - `GET https://<api>.onrender.com/api/v1/healthz` → `200 {"status":"ok"}`.
   - Verify `GET /api/v1/games` returns only published games (drafts excluded) and `GET /api/v1/admin/session` returns `401` unauthenticated.
8. **Rollback procedure:**
   - Redeploy prior commit/tag (`local-baseline-v1`) in Render dashboard.

---

### Service 4: Isolated Game Origin — Cloudflare Pages + Functions

1. **Selected provider & why:** **Cloudflare Pages** — **no card required**, provides an isolated `*.pages.dev` origin distinct from the portal, preserves `frame-ancestors`, `connect-src 'none'`, `nosniff`, `no-referrer`, and `PREVIEW_TOKEN_SECRET` HMAC validation.
2. **Exact free-tier limitations:** Unlimited static asset requests (`/games/*`); Pages Functions (`/packages/*`, `/preview/*`) share **Workers Free** (`100,000 req/day`, `10 ms CPU/req`).
3. **Card required:** **No** (for Pages + Functions without R2).
4. **Required environment variables / secrets (names only):**
   - `MAIN_SITE_ORIGIN` (exact deployed portal origin)
   - `PREVIEW_TOKEN_SECRET` (secret, byte-for-byte identical to API `GAME_PREVIEW_TOKEN_SECRET`)
   - *(If B2 adapter approved)* `B2_S3_ENDPOINT`, `B2_BUCKET`, `B2_ACCESS_KEY_ID`, `B2_SECRET_ACCESS_KEY`
5. **Required source-code changes:**
   - Copy `apps/games/public/games/` (`game.css`, `meteor-dash/`, `orbit-memory/`) into `apps/game-origin/public/games/` so built-in games serve from the isolated Pages origin.
   - Add `apps/game-origin/public/_headers` so static `/games/*` responses enforce identical security headers (`Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors <portal-origin>`, `Cross-Origin-Resource-Policy: cross-origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`).
   - Update `apps/game-origin/wrangler.toml`: remove placeholder `replace-before-deploy.invalid` and remove `[[r2_buckets]]` if using B2/built-in-only without R2.
6. **Deployment steps:**
   - Deploy `apps/game-origin` via `wrangler pages deploy public` (or Git integration with root `apps/game-origin`).
7. **Health checks & acceptance tests:**
   - Verify `https://<games>.pages.dev/games/meteor-dash/index.html` returns `200` with `frame-ancestors` matching portal origin.
   - Verify direct embedding from an unauthorized origin is blocked by `frame-ancestors`, and portal `<iframe>` keeps `sandbox="allow-scripts"`.
8. **Rollback procedure:**
   - Instant deployment rollback in Cloudflare Pages dashboard.

---

### Service 5: Next.js Portal — Cloudflare Workers (OpenNext) *(Fallback: Netlify Free)*

1. **Selected provider & why:** **Cloudflare Workers Free via `@opennextjs/cloudflare`** — **no card required**, supports Next.js 16 App Router, `proxy.ts` CSP nonces, and `rewrites()` proxying `/api/:path*` to Render. *(Fallback: **Netlify Free**, no card, commercial allowed, `300 credits/mo` hard cap, if dynamic SSR exceeds Workers Free's 10 ms CPU limit.)*
2. **Exact free-tier limitations:**
   - **Workers Free:** `100,000 req/day`, **`10 ms` CPU/req**, `128 MB` RAM, `50` subrequests/req; `workers.dev` intended for non-business-critical use.
   - **Netlify Free (fallback):** `300 credits/month` hard cap (site pauses when exhausted).
3. **Card required:** **No**.
4. **Required environment variables (names only):**
   - `API_INTERNAL_ORIGIN` (`https://<api>.onrender.com`)
   - `NEXT_PUBLIC_SITE_ORIGIN` (`https://<portal>.workers.dev`)
   - `NEXT_PUBLIC_GAME_ORIGIN` (`https://<games>.pages.dev`)
5. **Required source-code changes:**
   - Add `@opennextjs/cloudflare` devDependency, `open-next.config.ts`, and `wrangler.jsonc` (`nodejs_compat`) in `apps/web/`.
   - In `apps/web/next.config.ts`: guard `dotenv.config(...)` so it only runs when `../../.env` exists locally, and set `images: { unoptimized: true }`.
   - **CPU Risk Mitigation:** Benchmark `apps/web` SSR CPU time under OpenNext. If `await connection()` in `apps/web/src/app/layout.tsx` exceeds `10 ms` CPU on Workers Free, switch `apps/web` to **Netlify Free** (`300 credits/mo`) rather than weakening `proxy.ts` CSP nonces.
6. **Deployment steps:**
   - Build with OpenNext (`opennextjs-cloudflare build`), set Worker env vars/secrets, deploy to `*.workers.dev`.
7. **Health checks & acceptance tests:**
   - Verify `/`, `/games`, `/search?q=meteor`, `/games/meteor-dash`, `/admin/login`, EN/BN toggle, and `0` console/CSP errors.
   - Verify `/api/v1/admin/session` login sets `sp_session` + `sp_csrf` (`SameSite=Strict; Secure`) on the portal origin through the `/api/:path*` rewrite and `requireSameOrigin` passes.
   - Verify Render cold-start behavior: wait >15 min, load `/`, confirm graceful loading/error state or recovery once Render wakes.
8. **Rollback procedure:**
   - `wrangler rollback` (Cloudflare Workers) or instant rollback in Netlify dashboard.

---

## 2. Cross-Origin Communication Matrix

| Flow | Source Origin | Target Origin | Security Controls Preserved |
|---|---|---|---|
| **Browser → Portal** | Browser | `https://<portal>.workers.dev` | Per-request CSP nonce (`proxy.ts`), `frame-src 'self' https://<games>.pages.dev`, `X-Frame-Options: DENY` |
| **Portal `/api/*` → Express API** | `https://<portal>.workers.dev` (rewrite proxy) | `https://<api>.onrender.com` | `WEB_ORIGIN` exact match (`requireSameOrigin`), `SameSite=Strict; Secure` host-only cookies, `X-CSRF-Token` |
| **Portal `<iframe>` → Game Origin** | `https://<portal>.workers.dev` | `https://<games>.pages.dev` | `sandbox="allow-scripts"`, `frame-ancestors https://<portal>.workers.dev`, `connect-src 'none'`, `no-referrer` |
| **Game Origin ↔ API** | — | — | **Zero direct communication**; preview access uses API-signed 5-min HMAC token (`PREVIEW_TOKEN_SECRET`) |

---

## 3. Decisions Requiring Owner Approval Before Execution

1. **Object Storage Choice (Blocks ZIP Uploads):**
   - **Option A:** Authorize adding a small S3 SigV4 fetch adapter to `apps/game-origin` so it can read private `staging/` and `packages/` from **Backblaze B2** (`৳0`, no card).
   - **Option B:** Keep `apps/game-origin` R2-only and launch the public demo with **built-in static games only** (`/games/meteor-dash/`, `/games/orbit-memory/`), leaving uploaded ZIP packages disabled until R2 is authorized.
2. **Render Free Cold Starts for Public Demo:**
   - Confirm you accept Render Free's **15-min inactivity sleep (`30–60s` cold start)** and ephemeral rate-limit resets for this public demo.
3. **Web Portal Runtime Selection:**
   - Confirm **Cloudflare Workers Free (OpenNext)** as primary (with **Netlify Free** `300 credits/mo` as automatic fallback if SSR exceeds `10 ms` CPU).
4. **Demo Catalog Visibility:**
   - Confirm whether `meteor-dash` and `orbit-memory` should remain `draft` initially or be published via the Admin console after deployment so the public demo homepage shows playable games.
5. **Authorize Preparation Edits:**
   - Approve making the minimal deployment-config changes listed in §1 (no architecture changes) on a new branch from `local-baseline-v1` when you are ready to proceed.
