# Free Deployment Audit

Status: research only; no provider accounts, services, buckets, domains, or deployment were created. Official pages rechecked 2026-11-10.

## Verified official facts

| Provider | Current official facts | Assessment for this project |
|---|---|---|
| Cloudflare Pages | Static asset requests that do not invoke Functions are free and unlimited. Pages Functions count against Workers Free: 100,000 requests/day and 10 ms CPU per invocation. Wrangler direct upload supports a `functions` folder; dashboard drag-and-drop does not compile one. | Candidate for the separate game origin only. The project requires a Function per package route, so requests consume the Workers quota. The current Next.js app and Express API are not Pages Functions. `pages.dev` account eligibility/terms still require owner review. |
| Cloudflare Workers | Free: 100,000 requests/day and 10 ms CPU per invocation. Hyperdrive Free: 100,000 database queries/day. Workers Paid is at least $5/month. | Do not assume the existing API can run on Workers: it is a long-running Express/Node server and has native Argon2 and in-memory rate limiting. Porting it would require a separately reviewed runtime/auth/rate-limit/retention design. |
| Cloudflare R2 | Standard free allowance: 10 GB-month storage, 1 million Class A requests/month, 10 million Class B requests/month; internet egress is free. Infrequent Access has different charges and no free allowance. Usage beyond included limits can be billable. | Candidate for private package storage. The S3 adapter is implemented and mock-tested, but there is no real bucket, account, credential, billing review, or production integration. Use Standard storage only; never use `r2.dev` as a production CDN. |
| Neon | Free is permanent and requires no card according to the current pricing page; the plan is described for prototypes, side projects, and small teams. Limits include 100 CU-hours/project, 1 GB/project (20 GB/account total), scale-to-zero after 5 minutes, 5 GB public egress/project, a 6-hour history window, one manual snapshot, and no scheduled snapshots. | Not accepted as a production database without a tested backup/restore strategy, load/connection assessment, and owner/provider suitability review. No database or region was selected. |
| Render | Official docs say not to use free instances for production. Free web services sleep after inactivity, filesystem is ephemeral, and Free Postgres expires 30 days after creation. | Rejected for production. |
| Vercel | Hobby is free, but official plan docs restrict it to personal/non-commercial use. | Rejected unless the owner confirms the project qualifies under current terms; no such assumption is made. |
| Netlify | Free is $0 for individuals with a finite 300-credit limit. Production deploys, compute, bandwidth, and web requests consume credits; functions run in ephemeral environments. The current service/runtime and its limits were not tested. | Candidate for further review, not approved for production. Verify commercial eligibility, credit exhaustion behavior, serverless compatibility, rate limiting, scheduled retention, and backups before considering it. |

## Architecture and isolation findings

- The game-origin implementation uses a separate Cloudflare Pages project, a private R2 binding, and fixed `/packages/{uuid}/...` paths. Preview requests use short-lived HMAC tokens and only read `staging/`; public requests only read `packages/`.
- The Worker sets immutable caching for published revisions; `private, no-store` for previews; fixed MIME types; CSP `frame-ancestors` for the portal; `nosniff`; no-referrer; and restrictive Permissions Policy. The web portal iframe sandbox is `allow-scripts` only.
- API auth cookies do not set a `Domain` attribute (host-only). The separate game origin therefore does not receive portal/admin cookies. The web CSP allows only the configured game origin.
- Pages project IDs produce separate `pages.dev` subdomains, which are different browser origins. Actual portal/game URLs and deployed headers still must be verified before release.
- Pages Functions are not free/unlimited compute: package requests invoke a Function and consume Workers Free requests/CPU. Static Pages assets that do not invoke a Function are free/unlimited.
- R2 bucket access must remain private. The Pages Function uses its binding; do not expose credentials or enable an R2 public development URL. Bucket/secret configuration and actual published/draft behavior were not tested against a provider.
- Cloudflare describes `workers.dev` as intended for personal/hobby projects that are not business-critical and recommends production Workers use a route or custom domain. This project does not use a `workers.dev` URL as its production game origin. Whether `pages.dev` meets this project's commercial/operational requirements remains for the owner/provider to verify.
- The game origin is only one part of deployment. The existing dynamic Next.js portal and long-running Express API require hosting. The existing Express process cannot be deployed unchanged as a Pages Function; a serverless conversion would need tests for authentication, rate limiting, retention scheduling, connection management, and graceful failure.

## Decision

No end-to-end no-cost production topology is verified. Keep the Cloudflare Pages + private R2 design as a candidate for game delivery, but do not deploy it or claim production suitability yet. The dynamic Next.js/Express/PostgreSQL host, backup/restore plan, free-plan terms, account eligibility, and real provider tests remain unresolved.

Do not force a deployment by exposing draft objects, using `r2.dev`, changing the approved isolation model, or relying on a plan intended only for non-commercial use.

## Owner-only steps and blockers

1. Sign in to the chosen provider and confirm account eligibility, applicable terms, free quota limits, region, and whether setup requires billing/payment details. Do not enter payment details or enable paid resources.
2. Select/approve a production-compatible no-cost host for the current dynamic Next.js and Express/PostgreSQL architecture, or authorize a separately reviewed architecture change.
3. If Cloudflare is selected for game delivery, create a private Standard R2 bucket and Pages project; configure secrets through provider secret stores; do not send credentials in chat.
4. Configure a production database with separate migration/runtime roles and a tested backup/restore process.
5. After these steps, run real upload, private preview, publish, rollback, unpublish, game-load, admin-auth, and origin-isolation smoke tests.

## Official sources

- Cloudflare Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare Pages direct upload and Functions deployment: https://developers.cloudflare.com/pages/get-started/direct-upload/
- Cloudflare Workers pricing and Free limits: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare `workers.dev` usage guidance: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- Cloudflare R2 pricing/free allowance: https://developers.cloudflare.com/r2/pricing/
- Neon pricing, resource limits, scale-to-zero, history, and snapshots: https://neon.com/pricing
- Render Free limitations: https://render.com/docs/free
- Vercel Hobby terms/limits: https://vercel.com/docs/plans/hobby
- Netlify Free plan and credits: https://www.netlify.com/pricing/
- Netlify Functions runtime overview: https://docs.netlify.com/build/functions/overview/

Limits and terms can change; recheck all official sources immediately before any account setup or deployment.
