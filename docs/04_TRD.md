# 04 — Technical Requirements

## Proposed architecture
Next.js App Router + TypeScript web/admin; separate Express REST API + TypeScript; PostgreSQL; Prisma; Tailwind CSS; workspace/monorepo; HTML5 builds served from dedicated isolated game origin.

## Version policy
Do not invent exact versions. During authorized bootstrap verify supported Node/package manager and mutually compatible stable versions from official sources, pin dependencies/lockfile, run clean install/lint/typecheck/tests/build, and record evidence.

## Localization technical requirements
- UTF-8 end to end.
- Translation resources separated by locale (`en`, `bn`).
- No hard-coded user-facing strings in components.
- Bangla-capable font fallback with license verification.
- Search normalization and indexing strategy must support Bangla Unicode text.
- Localized metadata fields and fallback behavior must be specified before schema migration.
- Locale preference storage must not become a tracking identifier.
- Email templates and admin UI localization requirements must be considered.
- Validate mixed-script content and accessibility labels.

## Trust boundaries
Browser → same-origin BFF → authenticated Express API → PostgreSQL. Game content is untrusted and isolated on a dedicated game origin, without shared authentication cookies.

## Provider candidates
Vercel, Render, Neon, Cloudflare R2, Resend/equivalent. Verify pricing, quotas, regions, service behavior, backups, terms and security before selection/provisioning.

## Security
No public admin registration/default credentials; strong password hashing; login throttling; secure HttpOnly sessions; CSRF strategy; strict server-side authorization; upload/archive defenses; least-privilege DB roles; CSP/iframe sandbox; no secrets in frontend/Git/logs/settings.
