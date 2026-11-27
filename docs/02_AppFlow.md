# 02 — Application Flow and State Model

## Routes
Public: `/`, `/games`, `/games/[slug]`, `/category/[slug]`, `/search?q=`, `/contact`, `/privacy`, `/terms`.
Admin: `/admin/login`, `/admin`, `/admin/games`, `/admin/games/new`, `/admin/games/[id]/edit`, `/admin/games/[id]/preview`, `/admin/games/[id]/revisions`.

## Language flow
- Provide a visible English/Bangla switcher in desktop navigation and mobile menu.
- Switching language updates translated UI without unexpectedly resetting current route or search/category context.
- Localize route strategy is pending technical design; do not create inconsistent URL behavior.
- Persist selected language locally only if needed; no account or visitor identity is created.
- If a translation key is missing, use documented fallback and record the missing translation for correction.
- Localize validation, empty, error, loading, success and accessibility labels.

## Public flow
Home loads published catalog; skeleton while loading; curated empty state if empty; retry on failure.
Browse/search/category loads published games, applies URL-backed filters, supports clear filters and English/Bangla search.
Game detail loads published metadata and active immutable revision. Play transitions idle → loading → ready/playing. Failure shows retry and return actions. Fullscreen is requested only from a user gesture; denial/unsupported state has fallback.
Favorites use browser-local storage only. If storage unavailable, explain persistence may not work.
Contact validates fields, rate-limits and sends via provider. Never persist body/attachments in app DB or logs.

## Admin flow
Login → server credential verification → secure HttpOnly session. Generic errors and rate limiting. No public registration/reset.
Game workflow: draft → validate → authenticated private preview → publish → unpublish/archive. Admin UI is available in English and Bangla.

## States
Admin session: anonymous/authenticated/expired/revoked.
Game: idle/loading/ready/playing/fullscreen/error.
Content: draft/validated/published/unpublished/archived.
Global: loading, empty, error, offline, not found, unauthorized. Never expose draft existence publicly.

## Accessibility
Semantic headings, labelled controls, visible keyboard focus, keyboard navigation, reduced motion, adequate touch targets, accessible dialogs and an accessible language switcher.
