# 01 — Product Requirements Document

## Product summary
Shrabon Playworks is an independent browser-games destination for discovering and playing original HTML5 games without installing a native application. It is inspired by the convenience and discoverability of online game portals, but must have its own brand, original content, UI, and implementation.

## Problem
Players need a simple place to discover lightweight browser games that load quickly, work on common desktop and mobile browsers, and can be played without creating an account. The owner needs a manageable publishing workflow for a small original game catalog.

## Target personas
- Casual player: wants to find and immediately play a game.
- Returning player: wants to revisit games and use locally saved favorites.
- Administrator/owner: wants to add, edit, preview, publish, unpublish, and manage game metadata and assets.

## Product goals
- Make game discovery obvious and low-friction.
- Provide reliable game launch and fullscreen behavior.
- Support responsive desktop/mobile UI.
- Support both English and Bangla in the MVP.
- Keep untrusted game code isolated from the main site and admin.
- Give the owner a secure, auditable publishing workflow.

## MVP scope
1. Home page with featured/recent sections.
2. Browse/catalog page.
3. Search by title and supported metadata, including Bangla.
4. Categories/genres.
5. Game detail page with description, instructions, tags, and play action.
6. HTML5 game player with fullscreen control and loading/error states.
7. Related games.
8. Local favorites using browser-local storage; no account sync.
9. Responsive desktop/mobile UI.
10. English and Bangla UI with visible language switcher.
11. Private administrator login and dashboard, localized in both supported languages.
12. Game metadata CRUD, draft/publish/unpublish, authenticated admin-only preview.
13. Secure game asset ingestion and versioned releases.
14. Minimal privacy-preserving analytics.
15. Contact form with email delivery and no app-DB persistence of message content.

## User stories and acceptance criteria
- A visitor can switch between English and Bangla on public pages.
- Language switching preserves the current page and browse/search context where possible.
- A visitor can search supported English and Bangla metadata.
- Core navigation, forms, loading/empty/error/success states and admin UI have both translations.
- Bangla text renders correctly without clipping on supported desktop/mobile viewports.
- Other player and admin stories are detailed in `02_AppFlow.md`.

## Success metrics
Successful game launch rate, load-time percentiles, search-to-launch conversion, returning visits using privacy-safe aggregate measurement, frontend error rate, admin publishing success, and number of original games published (~10 initial target).

## Non-goals
Player registration, multiplayer, chat, comments/ratings/leaderboards, payments/subscriptions/ads, user-uploaded games, Unity/native game formats, public draft previews, recommendation ML, microservices absent demonstrated need, and native mobile apps.

## Content/IP
Only publish games owned by Shrabon Playworks or with documented distribution rights. Do not copy competitor branding, assets, source code or distinctive layouts.

## Risks and assumptions
Free hosting plans may sleep/throttle/change. Browser fullscreen/input behavior varies. HTML5 games are untrusted. Bangla typography/search requires explicit testing. No 10,000-concurrent-user guarantee is assumed without load testing.

## Pending
Default language (English or Bangla) remains an owner decision. Provider, exact dependency versions and operational thresholds require verification.
