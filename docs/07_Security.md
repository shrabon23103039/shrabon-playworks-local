# 07 — Security Architecture

## Threats/assets
Protect admin credentials/sessions, publishing controls, database, game builds, storage/email credentials and visitors from credential attacks, malicious uploads, compromised dependencies and untrusted game code.

## Boundaries
Public client untrusted; admin client untrusted; game runtime untrusted; API authorizes; DB private; providers are external dependencies.

## Admin
One owner-controlled bootstrap; no default credentials/public registration/reset. Vetted password hashing, login throttling, secure HttpOnly SameSite cookies, session expiry/revocation, generic errors, re-auth for sensitive actions where appropriate. Every admin mutation checks authorization server-side.

## Game isolation
Dedicated game origin distinct from portal/admin/API. No shared auth cookies. Restrictive iframe sandbox and capability allowlist. CSP and response headers tested. No top navigation/popups/downloads/camera/mic/geolocation/clipboard by default. `postMessage` requires exact origin and schema validation. Game content must not access portal DOM, admin cookies or API credentials.

## Uploads
Allowlist formats; compressed/expanded size limits; prevent traversal, symlinks, archive bombs and server-side execution. Generate object keys, validate manifest/entry path, hash content, stage privately, publish immutable revisions. Never execute uploads on API server.

## Web/API/secrets
Input validation, output encoding, safe DB access, CSRF protection for cookie mutations, rate limits, request size limits, security headers, narrow CORS. Secrets only in secret stores; no frontend bundles, Git, logs or settings. Separate migration and runtime DB roles.

## Data
No persistent visitor ID/fingerprinting. No contact message body/attachments in app DB/logs. Rotate compromised secrets.

## Release gates
Authorization/session tests, upload security, game isolation, CSP/iframe, dependency review, secret scan, rate limits, backup restore. Documentation is not a penetration test or certification.
