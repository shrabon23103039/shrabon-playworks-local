# 16 — API Usage Guide

Implemented API base path: `/api/v1`.

Public `GET /games`, `GET /games/:slug`, and `GET /categories` return published content only. `GET /healthz` checks API/database/retention health. The catalog currently returns a bounded page of games; search/category query parameters are supported by `GET /games`.

Admin APIs require an authenticated administrator session. Mutations require the matching CSRF cookie/header and same-origin `Origin`. Never expose server-to-server credentials in browser code.

Game uploads use `POST /admin/games/:id/assets` with `Content-Type: application/zip`; the package is staged and remains private until validated and published. `GET /admin/games/:id/preview` issues a short-lived token for the separate game origin. Do not expose that token publicly.

Contact submissions use minimal fields and respect rate limits. Delivery is disabled until Resend credentials and sender/recipient addresses are configured; no contact message body is stored in the application database. Do not retry indefinitely.

Use the safe error envelope and request ID. Display friendly messages; technical logs are redacted. Breaking API changes require versioned contract updates and synchronized frontend/API changes.
