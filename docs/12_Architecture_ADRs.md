# 12 — Architecture Decision Records

Statuses: Approved, Proposed, Conditional, Deferred, Rejected, Superseded.

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Original Shrabon Playworks HTML5 portal | Approved |
| ADR-002 | HTML5-only initial game format | Approved |
| ADR-003 | Next.js web/admin + Express API + PostgreSQL + TypeScript/Prisma | Proposed baseline; verify versions |
| ADR-004 | Dedicated isolated game origin | Approved security requirement |
| ADR-005 | Authenticated-admin-only draft preview | Approved |
| ADR-006 | Contact email; no app DB message-body persistence | Approved |
| ADR-007 | No persistent visitor ID; raw analytics 90 days; anonymous daily aggregates 365 days | Approved per owner decision reconciliation |
| ADR-008 | Vercel/Render/Neon/R2 provider shortlist | Conditional verification |
| ADR-009 | Custom domain | Deferred |
| ADR-010 | Same-origin BFF to authenticated Express API | Approved architectural direction; provider verification remains |
| ADR-011 | Owner-controlled one-time admin bootstrap/recovery | Approved operational direction; procedure must be tested |
| ADR-012 | Neon Night visual identity and palette | Approved by owner |
| ADR-013 | API/database same suitable region strategy | Approved direction; exact region subject to verification |
| ADR-014 | English and Bangla UI in MVP | Approved by owner |
| ADR-015 | English as initial locale | Approved for this autonomous run; follow explicit recommendation in `AUTONOMOUS_IMPLEMENTATION.md` |
| ADR-016 | No Git repository initialization at baseline | Chosen for documentation-only supplied workspace; preserve provenance and avoid manufacturing history |
| ADR-017 | Local filesystem is development-only for game packages; production requires durable shared object storage | Adapter implemented; provider conditional |
| ADR-018 | Use a separate Pages Functions + private R2 game-origin as the first no-cost delivery candidate | Conditional; account, terms, and real deployment unverified |

## ADR-012 — Neon Night
- Decision: Use the exact tokens in `03_UI_Spec.md`.
- Consequence: Premium dark UI with restrained purple/blue/pink accents; game art supplies visual variety.

## ADR-014 — Bilingual MVP
- Decision: English and Bangla interface support is required in MVP.
- Consequence: translation keys, UTF-8, Bangla-capable font fallback, localized UI states and bilingual QA are required.
- Open detail: default language and per-game content translation fallback require owner decision.

## ADR-015 — Default locale
- Decision: English is the initial locale, with a visible English/Bangla switcher and complete parity for required interface states.
- Rationale: `AUTONOMOUS_IMPLEMENTATION.md` explicitly recommends English as default for autonomous implementation; it resolves the older pending default-language field without removing the bilingual requirement.
- Consequence: Locale choice is presentation preference only and must not create a visitor identity.

## ADR-016 — Git provenance
- Decision: Do not initialize Git solely as part of bootstrap.
- Rationale: The supplied project folder is a documentation baseline without `.git`; there is no verified remote or existing commit history. Avoid creating a misleading provenance trail.
- Consequence: Change review must use file inspection/diffs available in the workspace; Git-based CI/deployment remains unavailable until an owner repository is supplied or explicitly initialized later.

## ADR-017 — Game package storage
- Decision: The current local filesystem package store is for development and tests only. Production API and game-origin services must use a durable shared object-storage backend without collapsing the dedicated game origin.
- Status: Adapter implemented and locally tested; production provider conditional. Cloudflare R2 is a candidate, not an approved/provisioned provider.
- Rationale: Separately hosted services do not share local filesystems, and reviewed free Render instances have ephemeral filesystems. Storage lifecycle uses private staging and immutable package keys.
- Consequence: Production deployment still requires a real provider bucket, private access/credentials, end-to-end upload/publish/rollback/unpublish tests, and an eligible no-cost host.

## ADR-018 — Isolated game delivery candidate
- Decision: Evaluate a separate Cloudflare Pages Functions project backed by a private R2 binding for game assets; retain the dedicated game-origin boundary.
- Status: Conditional. No Cloudflare account, project, bucket, secret, URL, or production deployment exists.
- Rationale: Pages project subdomains can provide a distinct origin without a purchased custom domain; the Function can read private objects through an R2 binding and apply the tested MIME, cache, CSP, and preview-token policy. Cloudflare documents static Pages assets as free/unlimited and Pages Function requests as Workers usage.
- Consequence: Every package request invokes a Function and consumes Workers Free request/CPU quotas. Confirm current account eligibility, terms, cost/overage behavior, and whether `pages.dev` meets project requirements. Do not use `r2.dev`. This choice solves only game delivery; the existing dynamic Next.js/Express/PostgreSQL application still lacks a verified no-cost production host.
