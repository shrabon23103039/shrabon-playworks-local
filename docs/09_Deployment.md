# 09 — Deployment and Operations

## Status
No production provider is selected or provisioned. The local MVP, S3-compatible storage adapter, and Pages game-origin candidate build and test locally. No public URL, deployment commit, production database, real R2 integration, or provider login is claimed. See `FREE_DEPLOYMENT_AUDIT.md`.

## Required topology
Browser → same-origin web/BFF → authenticated API → private PostgreSQL. Game content is served from a dedicated origin distinct from the portal/admin. Do not collapse these trust boundaries.

Candidate game-delivery topology:
- Separate Cloudflare Pages project on its own `pages.dev` subdomain.
- Pages Functions read only from a private R2 bucket binding.
- API uploads into private `staging/{uuid}/` keys; validated publication copies content into immutable `packages/{uuid}/` keys.
- Preview endpoint reads staging keys only after validating the API-signed five-minute token. Public endpoint reads package keys only.
- Do not enable a public bucket or use `r2.dev` as a production CDN.
- Pages Functions count against the Workers Free quota; verify request/CPU limits and account terms.

The existing dynamic Next.js app and long-running Express API do not deploy unchanged as Pages Functions. A serverless adaptation is a separate architecture change and must preserve authentication, CSRF, global rate-limit behavior, retention cleanup, database connection safety, and operational error handling.

## Required production configuration

Keep all secret values in provider secret stores. Never commit them, place them in frontend-prefixed variables, or send them in chat.

### API
- `NODE_ENV=production`
- `DATABASE_URL` for the runtime database role (not the migration role)
- `WEB_ORIGIN` set to the exact portal origin
- `GAME_STORAGE_DRIVER=s3`
- `GAME_STORAGE_S3_ENDPOINT` (R2 S3 API endpoint), `GAME_STORAGE_S3_REGION=auto`, `GAME_STORAGE_S3_BUCKET`
- `GAME_STORAGE_S3_ACCESS_KEY_ID` and `GAME_STORAGE_S3_SECRET_ACCESS_KEY` for a least-privilege storage credential
- `GAME_PREVIEW_TOKEN_SECRET` with at least 32 characters
- Optional contact delivery variables only after sender/provider verification

Production API startup rejects local storage and requires S3 configuration and a preview signing secret.

### Game-origin Pages project
- Bind the private bucket as `GAME_ASSETS`.
- Set `MAIN_SITE_ORIGIN` to the exact deployed portal origin.
- Store `PREVIEW_TOKEN_SECRET` as a secret, byte-for-byte identical to API `GAME_PREVIEW_TOKEN_SECRET`.
- Replace the placeholder invalid origin and bucket name in `apps/game-origin/wrangler.toml` before deployment.
- Set the portal's `NEXT_PUBLIC_GAME_ORIGIN` to the Pages project origin and verify its CSP `frame-src` value.

### Web
- `NEXT_PUBLIC_GAME_ORIGIN` is public and must be the dedicated game origin.
- `API_INTERNAL_ORIGIN` must target the selected API deployment.
- `NEXT_PUBLIC_SITE_ORIGIN` and `WEB_ORIGIN` must match the portal's actual origin.
- The current Next.js application is dynamically rendered; a static-only Pages deployment is not sufficient without a supported Next.js runtime adapter.

## Local verification and deployment mechanics

- `npm run build --workspace @playworks/game-origin` bundles the Pages Functions.
- `npm run dev --workspace @playworks/game-origin` runs the Functions locally with Wrangler and an emulated R2 binding.
- Wrangler direct upload supports Pages Functions when the `functions` directory is present at the project root. Dashboard drag-and-drop does not compile Functions. The current npm deploy command is a candidate only; it has not been run against an authenticated account.
- The configured Pages project name currently yields a distinct `pages.dev` origin. Confirm that the real portal origin is different and that production response headers match the local tests.

No database migration/deployment, account, bucket, secret, domain, or service setup has been attempted. Do not create paid infrastructure, enter payment details, or bypass account verification.

## Provider verification before provisioning
Verify current price, quotas, overage behavior, bandwidth/egress, storage, build/runtime limits, sleep/cold starts, database compute/connections/backups, region, latency, TLS, secrets/access controls, terms, and commercial-use restrictions. Record official sources and the check date. For any free resource, determine whether crossing a quota stops service or creates charges; do not assume a hard spending cap exists.

## Environments and recovery
Separate dev/staging/prod and credentials. Use separate least-privilege migration/runtime database roles. Review migrations and make a backup before applying. Set RPO/RTO only after the actual provider plan is selected; run and document a restore drill. An untested backup is not verified.

## Monitoring
Monitor uptime, API errors/latency, game launch failures, admin login anomalies, storage/email failures, retention-task health, database limits, and free quotas. Avoid logging contact bodies, attachments, secrets, session tokens, or persistent visitor identifiers.

## Current release blockers
- No verified no-cost host for the existing dynamic Next.js app and long-running Express API.
- No owner-controlled provider account, private R2 bucket, production database, email sender, or deployment credentials are available.
- Real R2 integration and deployed origin isolation are unverified.
- Production database role separation, backups/restore, provider-side retention, monitoring, accessibility/performance, and production smoke checks remain incomplete.
