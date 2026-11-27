# 11 — Data Governance

## Principles
Collect minimum data, state purpose, restrict access, define retention, test deletion, avoid hidden tracking.

## Inventory/retention
- Game metadata/assets/revisions: operational content.
- Admin credentials/sessions: highly restricted.
- Audit events: restricted; redact secrets.
- Raw analytics: no persistent visitor identity; max 90 days.
- Daily anonymous aggregates: 365-day retention, approved in the owner's Phase 0 decision reconciliation.
- Contact body: transient provider delivery; no app DB/log persistence.
- Operational logs: no credentials, message bodies or unnecessary identifiers.

## Analytics
No fingerprinting, cross-session tracking or raw IP retention. Use coarse event allowlists and automatic deletion. Test retention jobs.

## Contact/provider
Provider may retain message according to its terms/settings. Disclose provider-side handling in privacy notice.

## Legal
Applicable Bangladesh and other jurisdiction privacy, consumer, copyright and electronic communication obligations require current qualified legal review. Not legal advice.
