# 08 — Testing Strategy

## Layers
Unit, integration, end-to-end, security, performance, accessibility and localization tests.

## Critical acceptance tests
- Draft games never appear in public endpoints.
- Admin APIs reject anonymous/unauthorized users.
- Preview requires authenticated admin.
- Published revisions are immutable.
- Game code cannot access portal/admin cookies or DOM.
- Contact body absent from app DB/logs.
- Raw analytics expire within 90 days; no persistent visitor identity.
- Favorites degrade gracefully without local storage.
- Fullscreen unsupported/denied state has fallback.
- English and Bangla cover all core navigation, forms and empty/error/success states.
- Bangla Unicode rendering, search, mixed-script sorting and line wrapping work on supported browsers.
- Language switching preserves route and search context.
- No clipped Bangla labels at supported viewport widths.
- Language switcher is keyboard and screen-reader accessible.

## Performance
Agree a traffic profile first. Measure p50/p95/p99, errors, throughput, DB saturation, CDN/storage and cold starts. No 10,000-concurrent-user guarantee without reproducible tests and adequate infrastructure.

## Release blockers
Critical security defect, draft exposure, isolation failure, data leak, failed restore, broken admin auth, or broken core localization/user journey blocks release.
