# 18 — Demo and Viva Guide

## Explanation
Shrabon Playworks is an independent browser gaming portal for discovering and playing original HTML5 games.

## Concepts
Frontend renders public/admin UI; Express API owns business logic and authorization; PostgreSQL stores structured catalog/admin data; object storage/CDN serves game builds; dedicated game origin isolates untrusted code; immutable revisions enable rollback.

## Demo sequence
Home → browse/search/category → game detail/play → fullscreen/mobile → local favorites → admin login → draft/validation/private preview/publish → revisions/rollback.

## Likely questions
Why HTML5? Browser-first distribution without native installation.
Why separate game origin? Untrusted game code must not share portal/admin security boundary.
Why no player accounts? Avoid unnecessary privacy/security/operational complexity in MVP.
How protect drafts? Public API exposes published content only; preview requires authenticated admin.
How privacy-safe analytics? No persistent visitor identity/fingerprinting; raw events expire within approved retention.

Only demonstrate features actually implemented and tested.
