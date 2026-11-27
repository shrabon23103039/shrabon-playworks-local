# Shrabon Playworks — Claude Code Rules

Read `docs/01_PRD.md` through `docs/06_Plan.md`, `docs/07_Security.md`, `docs/08_Testing.md`, `docs/12_Architecture_ADRs.md`, and `docs/EXECUTION_STATE.md` before any task. Read all other relevant docs before modifying those areas.

Current state is documentation-only. Do not write application code, install dependencies, create accounts, purchase services, provision infrastructure or deploy until the owner explicitly authorizes the applicable phase. Authorization is phase-scoped; Phase 1 does not authorize Phase 2, paid services or production.

Follow approved ADRs. Proposed/conditional decisions are not approved. Preserve dedicated isolated game origin, admin-only preview, no public player accounts, no persistent visitor IDs/fingerprinting, 90-day raw analytics limit, and no app DB/log persistence of contact bodies/attachments.

Never expose secrets, weaken security, or silently change requirements. Server-side authorization is mandatory. Report only tests actually run and versions actually verified.

For every task: identify phase/prerequisites; implement only authorized scope; run verification; report commands/results; update `docs/06_Plan.md` after each completed step and `docs/EXECUTION_STATE.md` after progress/blockers. Update ADRs/docs when decisions change. Stop for owner approval on spending, scope, architecture, infrastructure or release.


Localization requirement: English and Bangla UI are approved for MVP. Preserve translation-key architecture, UTF-8, Bangla-capable font coverage, and bilingual testing. Do not assume the default language; ask the owner. Do not silently omit translated loading/empty/error/success states or admin UI.


For an explicitly authorized autonomous implementation run, follow `docs/AUTONOMOUS_IMPLEMENTATION.md` in addition to these rules. It does not override owner authorization, security requirements, or spending/provisioning restrictions.


## Current owner authorization
The owner has explicitly authorized autonomous implementation of the Shrabon Playworks MVP, selection of recommended low-cost/free defaults, and public publication on a verified no-cost hosting path after all release gates pass. Follow `docs/AUTONOMOUS_IMPLEMENTATION.md`. Do not spend money, enter payment details, purchase a domain, or bypass provider account verification. If a genuine owner-only external action blocks publication, finish independent work and report the exact blocker.
