# 06 — Implementation Plan

**Current state: local MVP and storage adapter implementation are complete. Production provider selection and public launch remain blocked; see `EXECUTION_STATE.md` and `FREE_DEPLOYMENT_AUDIT.md`.**

## Phase 0 — Owner review and authorization (complete)
- [x] Establish product and MVP scope.
- [x] Approve Neon Night and English/Bangla UI.
- [x] Authorize autonomous implementation and no-cost publication.

## Phase A — Bootstrap (complete)
- [x] Inspect the workspace; confirm it is not a Git repository.
- [x] Verify Node.js v24.21.0 and npm 11.19.0.
- [x] Pin workspace dependencies and generate the npm lockfile.
- [x] Create web, API, games, and isolated game-origin workspaces.
- [x] Configure lint, typecheck, environment validation, tests, and production builds.
- [x] Run workspace lint, typecheck, tests, builds, and dependency audits.
- [ ] Configure hosted CI after an owner-controlled Git repository is available.

## Phase B — Foundation (implemented; production DB roles remain unverified)
- [x] Implement the web/API boundary and PostgreSQL schema/migrations.
- [x] Apply local `001_initial.sql` and `002_game_assets.sql`; verify migration records and public tables.
- [x] Seed the two initial categories and two games as drafts in the fresh local database.
- [x] Bootstrap the first local administrator; verify the account and exercise login/logout.
- [x] Implement one-owner bootstrap, session authentication, CSRF checks, and server-side authorization.
- [x] Implement input validation, rate limits, and security headers.
- [ ] Configure separate least-privilege migration/runtime credentials on the production database.

## Phase C — Public portal and admin (implemented)
- [x] Implement home, catalog, search, categories, game details, related games, favorites, and contact UI.
- [x] Implement English/Bangla UI, switcher, and localized states.
- [x] Implement admin dashboard, metadata CRUD, drafts, authenticated preview, publishing, unpublishing, and revisions.
- [x] Verify unauthenticated admin access is rejected and draft games remain absent from public APIs.

## Phase D — Game assets and runtime (implemented locally; real provider integration pending)
- [x] Implement ZIP validation/staging, path and symlink defenses, and compressed/expanded limits.
- [x] Implement local and S3-compatible storage adapters with unique keys, private staging, cleanup, immutable publication, rollback, and unpublish.
- [x] Recover incomplete object prefixes instead of treating partial publication as complete.
- [x] Require S3-compatible storage and a preview signing secret in production configuration.
- [x] Implement a Cloudflare Pages Functions game-origin candidate backed by a private R2 binding.
- [x] Test MIME, CSP, cache policy, draft privacy, signed preview, unsafe paths, storage failures, and partial publication recovery.
- [x] Build Pages Functions and run a local Wrangler Pages route smoke test.
- [ ] Verify against a real private R2 bucket and a deployed, distinct `pages.dev` game origin.

## Phase E — Product completion (implemented locally; provider-dependent flows remain open)
- [x] Implement contact delivery through the Resend adapter without application-DB message persistence.
- [x] Implement privacy-minimized daily aggregate analytics and scheduled retention cleanup.
- [x] Restrict startup and scheduled analytics retention cleanup to production so local development preserves existing analytics data.
- [x] Include two original playable HTML5 games and an honest smaller-than-target catalog.
- [x] Implement responsive layouts and bilingual loading/error/empty states.
- [ ] Configure and test contact delivery with an owner-controlled email provider and verified sender.
- [ ] Verify analytics retention, provider-side email retention, and accessibility/mobile acceptance on supported devices.

## Phase F — Verification and launch preparation (local gates pass; production gates blocked)
- [x] Run API/web/game-origin unit tests, lint, typecheck, production build, and dependency audit.
- [x] Start the local API, game server, and web frontend; verify health and public endpoints.
- [x] Run authenticated API/game-origin integration coverage for the publishing lifecycle against an isolated temporary database (previous checkpoint).
- [x] Verify local database migrations, seed data, and administrator bootstrap.
- [x] Recheck official Cloudflare Pages/Workers/R2, Neon, Render, Netlify, and Vercel documentation.
- [x] Harden the Neon backup workflow's connection-URI preflight after CI received a non-parseable secret value; remote credentials and restore remain unverified.
- [ ] Verify non-destructive local end-to-end startup against an existing initialized database after the owner supplies a valid local `DATABASE_URL`; do not migrate or seed as part of this check.
- [ ] Complete production secret scanning, accessibility/performance checks, backup configuration, and restore drill.
- [ ] Select and verify a production-suitable provider topology, quotas, terms, and account eligibility.

## Phase G — Public launch (not started)
- [ ] Select a genuinely no-cost, production-compatible host for dynamic Next.js and Express/PostgreSQL without weakening the approved security model.
- [ ] Complete owner-controlled account verification and private R2/Pages setup, if chosen.
- [ ] Deploy web/API/database and a genuinely isolated game origin on verified no-cost resources.
- [ ] Run production smoke/security checks and confirm no draft/secret leakage.
- [ ] Record public URLs, deployment identifier, rollback procedure, and actual quotas.

## Current decisions and blockers
- English is the default locale per ADR-015; Bangla remains fully required.
- Local development/tests use local package storage. Production requires S3-compatible object storage; Cloudflare R2 is a candidate only.
- Cloudflare Pages static assets are free/unlimited; Pages Functions count against the Workers Free quota (100,000 requests/day and 10 ms CPU/invocation as documented on 2026-11-10). The game-origin candidate invokes a Function for package routes.
- The current Express API is not deployable as-is on Pages Functions. No verified production-compatible free host was selected for it and the dynamic Next.js portal.
- Render Free is explicitly not for production. Neon Free is intended for prototypes/side projects and lacks scheduled snapshots. Vercel Hobby is personal/non-commercial. Netlify Free has a finite credit allowance and remains unverified for this exact runtime and release requirements.
- No production provider accounts, game-hosting credentials, email-provider credentials, or Git remote are available. No public deployment is claimed.
- Local services are running at `http://localhost:3000` (web), `http://localhost:4000` (API), and `http://localhost:4002` (game server). The first local administrator has been bootstrapped and login/logout verified.
- Do not spend money, enter payment details, purchase a domain, bypass account verification, or use `r2.dev` as a production CDN.

## Next actions
1. Owner verifies the selected no-cost provider account and terms without entering payment details or enabling paid resources.
2. Resolve a production-compatible host for the current web/API/database topology; if an architecture change is needed, review its impact on server-side auth, rate limits, retention, and backups first.
3. Configure and real-test private R2/Pages delivery if the free plan and account are eligible.
4. Complete production DB roles, backup/restore, contact delivery, monitoring, accessibility, performance, and secret-scan gates.
5. Deploy only when all gates pass.
