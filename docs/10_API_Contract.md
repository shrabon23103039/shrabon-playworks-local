# 10 — API Contract

Implemented contract summary; routes are under `/api/v1`. Payload validation and error behavior are enforced by the API. This document is a concise guide, not generated OpenAPI.

## Conventions
JSON over HTTPS; version under `/api/v1`; consistent error `{code,message,fieldErrors?,requestId?}`; server-side validation; bounded pagination; no stack traces/secrets in responses.

## Public routes
GET `/healthz`, GET `/games`, GET `/games/:slug`, GET `/categories`, POST `/contact`, POST `/analytics`. Public catalog routes return published content only; analytics accept coarse allowlisted events without visitor identifiers.

## Admin routes
POST/GET/DELETE `/admin/session`; GET `/admin/categories`; GET/POST `/admin/games`; PATCH `/admin/games/:id`; POST `/admin/games/:id/assets`; GET `/admin/games/:id/preview`; POST `/admin/games/:id/validate`; POST `/admin/games/:id/publish`; POST `/admin/games/:id/unpublish`; GET `/admin/games/:id/revisions`; POST `/admin/games/:id/rollback`.

Every admin route requires server-side authorization. Cookie-authenticated mutations require the CSRF token and same-origin request checks. Preview-token issuance is authenticated; the game origin validates a short-lived signed token.

## Contact
Proposed fields: name, reply email, message. Validate, rate-limit and deliver via provider. No app DB/log persistence of body or attachments.

## Auth
Secure cookie session; never store session token in localStorage or analytics. Document/test CSRF strategy.

## Status codes
200, 201, 204, 400, 401, 403, 404, 409, 413, 429, 500 with generic safe messages.

## Contract tests
API and web tests plus an authenticated local integration flow cover key contract behavior. Generated OpenAPI and contract-generation are not implemented.
