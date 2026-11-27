# Shrabon Playworks — Full Autonomous MVP Implementation & Launch

**Founder / owner:** Shrabon Biswas  
**Product:** Shrabon Playworks — original HTML5 gaming portal  
**Agent:** Codex / Claude Code / Cursor / equivalent coding agent  
**Mode:** Full autonomous execution within the boundaries below

> **OWNER AUTHORIZATION:** The owner explicitly authorizes the agent to choose sensible, secure, low-cost defaults; implement the complete MVP; test and fix it; select suitable free-tier deployment options; and publish the MVP publicly when all release gates pass. The agent must not stop merely because a routine preference or technical choice is undecided. It must use the recommendations in this document, record the choice, and continue.
>
> This authorization does not permit spending money, accepting paid contracts, using payment details, weakening security, or taking an irreversible action outside the project scope. If a free deployment requires a one-time owner login/verification, prepare the exact step and continue all independent work while waiting.

---

## 1. Primary instruction

Do not stop after planning, auditing, creating tasks, or preparing a deployment guide.

**Implement the complete MVP, verify it, fix failures, and publish it.** Make routine product and technical decisions autonomously using the recommended defaults below. Do not ask the owner to choose between ordinary technical alternatives.

Continue through all implementation phases and deployment preparation. Stop only for a genuine external blocker that cannot safely be resolved without owner action, such as an account login/verification challenge, missing owner-owned game assets, provider policy restriction, a required paid upgrade, or a critical unresolved security issue.

If blocked, continue every independent task that can safely proceed.

## 2. Product mission and MVP

Build an original, polished, responsive browser gaming portal where visitors can discover and play original HTML5 games without installing a native app.

MVP features:
- Premium Neon Night public gaming portal.
- Home, browse, categories, search, game details and related games.
- HTML5 game player with loading, error and fullscreen behavior.
- Responsive desktop and mobile layouts.
- English and Bangla interface throughout.
- English and Bangla descriptions/instructions for launch games when source content is available; use a clearly labelled fallback if translation source content is missing.
- Local browser favorites; no player accounts.
- One private administrator and dashboard.
- Game metadata CRUD, drafts, validation, authenticated admin-only preview, publish/unpublish, immutable revisions and rollback.
- Secure asset ingestion and isolated game runtime.
- Privacy-minimized analytics.
- Contact form with email delivery, without app-database persistence of message bodies/attachments.
- Basic operational monitoring and deployment documentation.

Target approximately 10 launch games. Do not fabricate, copy, scrape or publish games without distribution rights. If the owner has not supplied 10 original game builds, publish the functioning portal with clearly labelled demo/sample entries only if they are genuinely playable and original/licensed; otherwise launch with a smaller honest catalog and document the missing content. Never misrepresent placeholders as playable games.

## 3. Autonomous decision policy — choose and proceed

For routine unresolved decisions:
1. Inspect current repository and authoritative project docs.
2. Choose the safest, simplest, maintainable and lowest-total-cost option that meets requirements.
3. Prefer free-tier or local options where practical.
4. Verify current provider/version facts from official sources.
5. Record the decision in `docs/12_Architecture_ADRs.md` and update affected docs.
6. Continue without asking the owner.

Do not ask the owner to select ordinary libraries, folder names, component patterns, test frameworks, non-destructive defaults, or other reversible engineering details.

### Default decisions

| Area | Autonomous default |
|---|---|
| Brand | Shrabon Playworks |
| Founder | Shrabon Biswas |
| Design | Neon Night, exact tokens in `03_UI_Spec.md` |
| Default language | English |
| Other language | Bangla |
| Game format | HTML5 only |
| Launch catalog | Up to 10 original/licensed games actually available |
| Player accounts | None |
| Favorites | Browser-local |
| Admin | One private owner account |
| Frontend | Next.js App Router, React, TypeScript |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma, if compatible and beneficial |
| Styling | Tailwind CSS + approved tokens |
| API | Same-origin BFF to authenticated Express API |
| Game hosting | Dedicated isolated game origin |
| Raw analytics | Maximum 90 days |
| Anonymous daily aggregates | 365 days |
| Contact messages | Email delivery; no app DB/log body persistence |
| Domain | Temporary provider subdomains initially; custom domain deferred |
| Hosting | Best verified free-tier combination that meets security and operational needs |
| Deployment | Public MVP launch after release gates pass and only on free/no-cost resources |

Exact dependency versions must be verified and pinned. Do not use arbitrary `latest` or invented version numbers.

### Hosting and free deployment policy

Evaluate current official free plans and limits for suitable providers. Vercel, Render, Neon, Cloudflare R2 and an equivalent email provider are candidates, not guaranteed choices.

Choose the best combination based on:
- Actual free-tier eligibility and current terms.
- No mandatory paid subscription or trial that auto-converts.
- Build/runtime limits and sleep/cold-start behavior.
- Storage, bandwidth and egress quotas.
- Database compute, connection and backup limits.
- Region availability and latency.
- TLS, access controls, secrets and security.
- Whether the required dedicated game origin can be maintained.

Prefer a free provider subdomain for the initial launch. A custom domain is not required.

**Never enter payment details, start a paid trial, purchase a domain, exceed a free quota knowingly, or accept a paid upgrade.** If no secure, viable free deployment path exists, complete all local/staging work and report the precise blocker. Do not weaken game isolation to force a free deployment.

## 4. Mandatory repository inspection

Before editing:
1. Identify the actual repository root.
2. Inspect Git status, branch, recent commits and uncommitted changes.
3. Inspect source code, manifests, lockfiles, runtime, tests, CI and environment examples.
4. Read `CLAUDE.md`, `.cursorrules`, all relevant `/docs` files, especially `01_PRD.md`–`19_*`, `06_Plan.md`, `12_Architecture_ADRs.md`, `EXECUTION_STATE.md`, and this file.
5. Determine whether the repository is empty, partial, or already implemented.
6. Preserve working code and unrelated user changes.
7. Create a factual baseline in `docs/EXECUTION_STATE.md`.

If the workspace is not a Git repository, do not treat that alone as a blocker. Record it and continue; initialize Git only if appropriate and safe.

If documentation conflicts, follow the latest explicit owner decision and security invariants. Reconcile the documents and record the reason. Do not stop for harmless documentation inconsistencies.

## 5. Product and design requirements

Use the approved Neon Night tokens from `docs/03_UI_Spec.md`:
- Canvas `#10111B`
- Elevated `#141625`
- Surface `#191B2E`
- Raised surface `#22253B`
- Border `#30334B`
- Primary text `#F5F5FA`
- Secondary text `#A5A7BA`
- Purple `#8057FF`
- Blue `#35B8FF`
- Pink `#FF5C9A`
- Success `#35C98A`
- Warning `#F4B740`
- Danger `#FF647C`

Make the public website feel like a real gaming destination, not an admin template. Use original game art and consistent card design, clear categories, attractive navigation, responsive grids and restrained motion.

English is the default language. Bangla is also mandatory. Use translation keys, UTF-8, a Bangla-capable font with verified licensing, localized UI states and Bangla search. Do not leave untranslated buttons, errors, empty states or admin UI.

For game content, use real owner-provided translations when available. If absent, provide an honest fallback (for example, display the available language and label it) rather than inventing facts or claiming a translation is official.

## 6. Non-negotiable security and privacy

### Game isolation
- Treat all game code as untrusted.
- Use a dedicated game origin separate from portal, admin and API.
- Do not share auth cookies.
- Use restrictive iframe sandbox and CSP.
- Validate `postMessage` origin and schema.
- Deny unnecessary permissions by default.
- Prevent game code from accessing portal DOM, admin sessions, API credentials or secrets.

### Admin
- One private administrator.
- No public registration, default credentials or public reset flow.
- Strong password hashing, login throttling, secure HttpOnly sessions, expiry/revocation.
- Server-side authorization on every admin operation.
- Audit sensitive publishing actions without secrets.

### Uploads
- Allowlist expected formats.
- Enforce compressed and expanded size limits.
- Defend against traversal, symlinks, archive bombs and malformed manifests.
- Generate object keys.
- Stage and validate before publishing.
- Never execute uploads on the API server.
- Published revisions are immutable; rollback selects a validated known-good revision.

### Privacy
- No persistent visitor IDs, fingerprinting or cross-session visitor tracking.
- Raw analytics expire within 90 days.
- Anonymous daily aggregate retention is 365 days.
- Contact bodies/attachments are not stored in application DB or logs.
- Verify and disclose provider-side email retention.
- Do not log secrets, credentials, tokens, contact content or unnecessary personal data.

### Data and database
- Use a restricted runtime DB role and separate migration credentials.
- Validate all input server-side.
- Use safe parameterized database access.
- Implement CSRF protection for cookie-authenticated mutations.
- Use rate limits and request-size limits.
- Backups and restore tests are required before production release.

## 7. Implementation workflow — continue until complete

For every task:
1. Select the next dependency-ready task in `docs/06_Plan.md`.
2. Read the relevant specification and security requirements.
3. Implement the smallest complete change.
4. Add/update tests.
5. Run relevant tests, lint, typecheck and build.
6. Fix failures and rerun affected tests.
7. Inspect the diff for secrets, accidental changes and security regressions.
8. Update `docs/06_Plan.md`.
9. Update `docs/EXECUTION_STATE.md`.
10. Append an entry to `docs/IMPLEMENTATION_LOG.md`.
11. Update ADRs and affected docs when a decision changes.
12. Move to the next eligible task.

Do not stop after a phase plan. Do not ask for routine approvals for reversible work within this mission.

### Phase A — Bootstrap
- Verify runtime and package manager.
- Verify framework/library compatibility from official sources.
- Pin versions and create lockfile.
- Create/reconcile workspace structure.
- Configure TypeScript, lint, formatting, environment validation and CI.
- Run clean install, lint, typecheck, tests and production builds.

### Phase B — Foundation
- Implement web/API boundaries and shared contracts.
- Configure PostgreSQL, migrations and least-privilege roles.
- Implement owner admin bootstrap and secure sessions.
- Implement authorization, validation, error handling, rate limits and security headers.

### Phase C — Public portal and admin
- Implement home, browse, search, categories, details and related games.
- Implement bilingual UI and language switcher.
- Implement local favorites.
- Implement admin login/dashboard/game CRUD.
- Implement draft, validation, authenticated preview, publish/unpublish, audit and revisions.
- Verify public APIs never expose drafts.

### Phase D — Game asset pipeline and runtime
- Implement upload validation and staged storage.
- Implement immutable revisions and rollback.
- Implement dedicated game origin and iframe/CSP isolation.
- Implement player loading, error, retry and fullscreen behavior.
- Test hostile/unexpected content.

### Phase E — Product completion
- Implement contact email adapter.
- Implement privacy-safe analytics and deletion jobs.
- Complete responsive/mobile/accessibility work.
- Integrate only available original/licensed game builds.
- Add honest empty states if catalog content is incomplete.

### Phase F — Verification and launch preparation
- Run unit, integration, E2E, security, accessibility, localization and performance tests.
- Verify retention and deletion.
- Verify backup and perform restore drill where provider supports it.
- Configure minimal uptime/error monitoring.
- Review current free-tier quotas and terms.
- Prepare rollback and deployment instructions.

### Phase G — Publish
- If a verified no-cost deployment path exists, deploy the MVP to temporary provider subdomains.
- Preserve dedicated game-origin isolation.
- Configure only free resources.
- Run production smoke tests.
- Verify homepage, search, game detail, game launch, admin login, private preview, publish workflow, language switching and mobile behavior.
- Confirm no draft leakage and no secrets in client output.
- Publish only after all release gates pass.
- Record public URLs, deployment commit, provider/plan, quotas checked, test evidence and limitations in `docs/EXECUTION_STATE.md` and deployment docs.

If deployment requires a paid plan, payment details, owner account verification, acceptance of terms, or another owner-only action, do not bypass it. Complete all other work and provide the exact action the owner must perform.

## 8. Testing and honest reporting

Never claim a test passed unless actually run. Record exact commands, exit codes and meaningful results.

Do not:
- Disable failing tests to get a green build.
- Weaken security controls to simplify deployment.
- Fabricate games, user reviews, analytics or performance results.
- Claim support for 10,000 concurrent users without reproducible load tests.
- Claim a penetration test or certification from a code review.

A critical security failure, public draft exposure, game isolation failure, secret leak, failed authorization test or failed restore blocks publication.

## 9. Session checkpoint and resume

Maintain `docs/EXECUTION_STATE.md` as the authoritative checkpoint. After meaningful progress, record:
- Current phase/task.
- Completed and pending task IDs.
- Files changed.
- Commands and actual test results.
- Known failures and blockers.
- Decisions made autonomously and their rationale.
- Next exact task.
- Git branch/commit if available.
- Staging and public URLs if deployed.

Append chronological entries to `docs/IMPLEMENTATION_LOG.md`.

On a new session:
1. Read agent instructions and this file.
2. Inspect repository and Git status.
3. Read execution state and implementation log.
4. Verify the previous task exists and tests are real.
5. Resume from the next incomplete task.
6. Do not repeat completed work unnecessarily.

## 10. Completion definition

The authorized MVP is complete when all in-scope features work, security/privacy invariants are verified, English/Bangla UI is tested, documentation/checkpoints are current, and the release checklist is satisfied.

The public launch is complete only when:
- A real deployment exists.
- Public URLs are recorded.
- Production smoke tests pass.
- Game origin is isolated.
- Admin preview is private.
- No secrets or drafts are exposed.
- Free-tier constraints are documented.
- The deployed commit and rollback procedure are recorded.

If no free and secure hosting path exists, report **implementation complete, publication blocked by provider constraint**. Never pretend it is published.

## 11. Final report

At completion provide:
1. Implemented features.
2. Final architecture and actual dependency versions.
3. Database migrations and API routes.
4. Security controls and tests.
5. English/Bangla coverage.
6. Test commands and actual results.
7. Performance measurements and environment.
8. Deployment provider/plan and verified limits.
9. Public URLs if successfully published.
10. Known limitations and unresolved blockers.
11. Rollback instructions.
12. Updated execution checkpoint.

**Operating principle:** Choose recommended defaults, work autonomously, finish the MVP, and publish on a verified free path. Be conservative with security, privacy, spending and external account actions. Never stop merely because routine choices remain undecided.
