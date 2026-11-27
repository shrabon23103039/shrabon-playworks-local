# 15 — Release Checklist

## Staging
- [x] Scope/acceptance criteria approved.
- [x] Dependencies/lockfile pinned.
- [x] Lint/typecheck/unit/integration/build pass locally.
- [ ] Secret scan clean.
- [x] Migrations reviewed and applied to an isolated temporary database.
- [x] Admin auth/session and server-side authorization tests pass.
- [x] Game isolation, upload validation, signed preview, publishing, rollback, and unpublishing integration flow pass locally.
- [ ] Contact body absent from app DB/logs.
- [ ] Analytics retention verified over a retention-window test.

## Production
- [ ] Production provider price/quotas/region/terms/security fully reviewed.
- [ ] Backup enabled and restore drill completed.
- [ ] Monitoring/alerts configured.
- [x] Local rate limits and abuse controls are configured; production traffic behavior is not measured.
- [ ] Accessibility/mobile acceptance checks completed on supported devices.
- [ ] Load test against agreed traffic profile.
- [ ] Rollback rehearsed.
- [ ] Privacy/terms reviewed.
- [ ] Owner completes provider account setup/verification and production terms acceptance.
- [ ] Owner explicitly approves the actual production release.

Current blocker: local uploaded-game storage is not durable/shared across separate hosting services. Do not deploy until the object-storage adapter and all production gates pass. See `FREE_DEPLOYMENT_AUDIT.md`.

## After release
Verify critical journeys, monitor errors/latency/game failures/email, ensure drafts are private, record release version and evidence.
