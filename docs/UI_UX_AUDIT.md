# UI & UX Audit — Shrabon Playworks

**Audit Date:** 2026-11-27  
**Scope:** Complete documentation review (`docs/`), frontend codebase (`apps/web/src`), game runtime (`apps/games`), API contracts (`apps/api/src/server.ts`), and headless Chrome visual/DOM inspection of `http://localhost:3000`.

---

## 1. Environment & Runtime Findings Observed
- At audit time, `apps/web` (`http://localhost:3000`) and `apps/games` (`http://localhost:4002`) were running locally, while `apps/api` (`http://localhost:4000`) could not start because local PostgreSQL (`127.0.0.1:5432`) was not running.
- Because the API was down, unmocked `http://localhost:3000` returned HTTP `500` on `/api/v1/categories` and `/api/v1/games?limit=6` via the Next.js rewrite proxy, directly exposing error-state defects on the live homepage.
- Additional visual captures were run with deterministic API response interception inside Chrome CDP using the exact two seeded games (`meteor-dash`, `orbit-memory`) and two seeded categories (`arcade`, `puzzle`) to inspect populated layouts at `1440×900` and `375×812`.

---

## 2. Visual, Layout & Information Architecture Defects

### 2.1 Generic AI-Template Hero & Poor Above-the-Fold Discovery
- **Observed (`home-before-1440x900.png`, `before-home-mock.png`):** The `.hero` container (`min-height: 470px`, `padding: clamp(32px, 7vw, 92px)`) consumes almost the entire 900px desktop viewport with a large dark-purple radial card, a decorative floating rounded square (`✧`) and two abstract circles, and generic marketing copy (`"FIND YOUR NEXT LITTLE OBSESSION / Play something wonderful."`).
- **Impact:** Zero playable games are visible above the fold on desktop or mobile. Players visiting a game portal expect immediate discovery and launch paths.

### 2.2 Broken Grid Proportions for Small Honest Catalog (2 Games, 2 Categories)
- **Observed (`before-home-mock.png`):**
  - `.category-grid` uses `repeat(4, minmax(0, 1fr))` even when only 2 categories exist (`Arcade`, `Puzzle`), leaving 50% empty horizontal whitespace.
  - `.game-grid` uses `repeat(3, minmax(0, 1fr))` even when only 2 games exist (`Meteor Dash`, `Orbit Memory`), leaving a dead 33% column on the right.
  - Category tiles display `"01 · From the studio"` — meaningless filler metadata.

### 2.3 Missing Original Game Artwork (Unicode Symbol Placeholders)
- **Observed (`game-grid.tsx`, `game-detail-page.tsx`, `before-home-mock.png`):** Game cards and the detail art panel render `✦` and `◈` Unicode characters over CSS radial gradients, hardcoded via `game.slug === "meteor-dash" ? "art-meteor" : "art-orbit"`.
- **Gap:** Any newly uploaded third game inherits `Orbit Memory`'s cyan styling and `◈` symbol. No real cover artwork or SVG illustrations exist in `apps/web/public` (which still contains stock Next.js `vercel.svg`, `next.svg`, `globe.svg`, `window.svg`, `file.svg`).

### 2.4 Error-State Mislabeling on Homepage
- **Observed (`home-before-1440x900.png`, `home-page.tsx` line 99):** When `/api/v1/categories` fails with HTTP `500`, the Categories section renders `{!categories.length && !loading && <div className="empty-panel"><p>{t("emptyGames")}</p></div>}`, showing `"No games here just yet."` inside a single 1/4-column dashed box instead of a full-width error notice or graceful recovery state.

### 2.5 Game Detail Page Pushes the Player Below the Fold
- **Observed (`game-detail-page.tsx`, `before-detail-mock.png`):** `detail-top` places an eyebrow, `60px` H1, paragraph, CTA buttons, tag pills, and a `340×205px` decorative box above `#player`, pushing the playable game frame down the page.
- **Observed:** Loading state is bare centered text (`"Getting your game ready…"`) with no structured skeleton.

---

## 3. Typography, Contrast & Spacing Issues
- **Sub-readable micro text (`globals.css`):** Extensive use of `10px` and `11px` font sizes:
  - `.brand-copy small`: `11px`
  - `.header-search button`: `11px`
  - `.language-switch button`: `11px`
  - `.card-kicker`, `.art-label`, `.fallback-label`, `.detail-tags span`, `.player-safety`, `.footer-inner nav a`, `.copyright`: `10px`–`11px`
  - `.game-card-body > p`: `12px` desktop / `11px` mobile
- **Bangla legibility risk:** Bangla vowel signs (`কার`/`ফলা`) clip or feel cramped at `10px`–`11px` and tight negative letter-spacing (`letter-spacing: -.06em` on `.hero h1` and `-.055em` on `.detail-top h1` harms Bangla conjunct rendering).
- **Inconsistent scale:** `15px` body size does not align with the approved `03_UI_Spec.md` scale (`12, 14, 16, 18, 20, 24, 32, 40, 48 px`).

---

## 4. Mobile & Responsive Defects (`before-home-mobile-mock.png`, `375×812`)
- **Wrapped CTA button:** `.hero-actions .button { flex: 1; }` forces `"Explore all games"` to wrap awkwardly onto two lines (`Explore all / games ->`) next to `"Favorites"`.
- **Wrapped section action link:** `"See all ->"` wraps onto two lines (`See / all ->`) beside `"Made for your next break"`.
- **Cramped header controls:** `.language-switch button` renders at `23×29px` (below WCAG 2.2 / touch target guidelines). At `<= 480px`, `.header-search.search-open` uses `position: absolute; right: 116px; left: 12px`, covering the brand logo.
- **Hidden search submit on 481–760px:** `.header-search button { display: none; }` removes the explicit search submit control at tablet/small-desktop widths.
- **Admin table & forms:** Action links lack wrapping/spacing structure on small screens; `window.confirm` is used for rollback instead of an accessible in-page dialog.

---

## 5. Functional, Routing & Copy Defects

### 5.1 Uploaded Package Games Blocked in `GamePlayer` (Functional Bug)
- **File:** `apps/web/src/components/game-player.tsx:20`
- **Defect:** `start()` checks `if (!["/games/meteor-dash/index.html", "/games/orbit-memory/index.html"].includes(entryPath))`. Any admin-uploaded ZIP package (`/packages/<uuid>/index.html`, which `apps/api/src/security.ts` explicitly supports via `isValidGameEntryPath`) fails to launch with `"The game did not load"`.

### 5.2 Missing `/search` Route
- **Files:** `docs/02_AppFlow.md` specifies `/search?q=`, yet `apps/web/src/app/search/page.tsx` does not exist (returns 404).

### 5.3 Search State Out of Sync with URL (`catalog-browser.tsx`)
- **Defect:** `CatalogBrowser` stores `initialQuery` only in initial `useState(initialQuery)`. Navigating via the header search bar while already on `/games` does not refresh the search results, and submitting in-page search does not update the URL query string (`?q=`), breaking language-switch context preservation and browser history.

### 5.4 Wrong Copy & Subtitle Bugs
- **`game-grid.tsx:40`:** `localizedText(game.category, locale).text ?? t("studio")` — `localizedText` returns `""` (not `undefined`), so the nullish coalescing fallback never triggers when category is missing.
- **`catalog-browser.tsx:83`:** Favorites page header subtitle always prints `t("emptyFavorites")` (`"Your favorites will show up here."`) even when favorites exist. Catalog page prints `"games to explore"` with no count (`"2 games to explore"`).
- **`admin-pages.tsx:227`:** Admin dashboard "Manage games" section prints `t("loginCopy")` (`"This area is private. There is no public account registration."`) as its section description!
- **`game-player.tsx:97`:** `"The game runs in a separate restricted frame."` is hardcoded in English instead of using a localized `messages` key (missing Bangla translation!).
- **`site-shell.tsx:23,60,28`:** `aria-label="Footer"`, `aria-label="Main navigation"`, and `© 2026 Shrabon Playworks` are hardcoded in English instead of localized keys.

### 5.5 Missing Features & UX Polish
- No **Recently Played** browser-local history (approved local-storage pattern).
- No **Clear search** button or instant Escape/clear handling.
- No **Restart** button inside `GamePlayer` when playing.
- No **Workflow stepper** or clear validation dependency guidance in Admin Game Editor; no search/status filtering on `/admin/games`; no accessible confirmation dialog for rollback/unpublish; no admin overview link back to public catalog.
- Unused stock Next.js SVGs (`vercel.svg`, `next.svg`, `globe.svg`, `window.svg`, `file.svg`) remain in `apps/web/public/`.
