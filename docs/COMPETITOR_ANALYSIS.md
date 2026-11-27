# Competitor Product Analysis — CrazyGames & Poki

**Inspection Date:** 2026-11-27  
**Method:** Direct visual and DOM inspection via headless Chrome (`1440×900`) on `https://www.crazygames.com/`, `https://www.crazygames.com/game/smash-karts`, `https://poki.com/`, and `https://poki.com/en/g/subway-surfers`. No anti-bot or CAPTCHA gates were triggered or bypassed.

---

## 1. Observed Competitor Patterns

### CrazyGames (`crazygames.com`)
- **Homepage structure:** Dark background (`#0c0d14`-style) with a sticky top bar (brand mark, centered search input, utility actions), a collapsible left genre rail, top horizontal intent chips (*"Train your brain"*, *"Adrenaline rush"*, *"5-minute fun"*), and modular horizontal game carousels (*Featured*, *New*, *Originals*).
- **Card system:** Crisp `16:9` landscape cards with dense `12px` gaps, hover preview states, clean corner badges, and concise titles.
- **Game detail / player page:** Launches straight into a large `16:9` player frame (`984×553px` at `1440px`) positioned **above the fold** (`y = 76px`), paired with an attached bottom control strip (game icon + title, favorite/bookmark, fullscreen) and a right-hand *"Play next"* discovery rail. Below the fold sits breadcrumb navigation (`Games > Genre > Title`), a structured metadata grid (Developer, Category, Engine, Platforms, Controls), tag pills with counts, and a clean "How to Play" guide.

### Poki (`poki.com`)
- **Homepage structure:** Zero-bloat entry—no marketing hero banner at all. Opens directly with a compact floating navigation capsule (Logo, Home, Categories, Search, Saved) embedded alongside a high-contrast bento mosaic of square/2×2 featured game tiles, followed by clean horizontal rows (*Popular Games*, *New Games*, *All Categories* pill strip with distinct visual icons).
- **Card system:** Bold, vibrant artwork tiles with subtle hover lift and zero text clutter on the grid itself (titles appear cleanly on hover/focus or in accessible labels).
- **Game detail / player page:** Places the `16:9` iframe (`836×470px`) immediately at the top (`y = 16px`), flanked by surrounding quick-pick tiles and an attached bottom bar (title + studio, feedback, fullscreen). Below sits a clean square-thumbnail game header, structured `About this game` specification table (Controls, Supported devices, Genre, Updated), and `More games` discovery.

---

## 2. Competitor Comparison Matrix

| Dimension | CrazyGames | Poki | Shrabon Playworks (Current MVP) | Target Redesign Direction |
|---|---|---|---|---|
| **Above-the-fold priority** | Immediate game grid & intent chips | Immediate bento game mosaic; zero hero bloat | 470px marketing hero pushing all games below fold | Compact studio header strip + immediate featured/playable game cards above the fold |
| **Header & Search** | Sticky top bar with prominent centered search | Floating pill bar with instant search icon | Small right-aligned search; hidden submit on tablet; overlaps logo on 480px | Sticky top bar with prominent search, clear button, accessible nav, and 44px-safe `EN / বাং` switcher |
| **Category Navigation** | Persistent icon sidebar + top intent strip | Clean horizontal icon-label category pills | 4-column grid leaving 50% empty space with 2 categories | Adaptive flex/grid category pills + clean category cards scaled to actual category count |
| **Game Cards** | Uniform `16:9` landscape cards, tight grid | Uniform square/bento tiles, art-first | Tall cards with Unicode `✦`/`◈` on CSS gradients; 3-col grid leaves blank slot | Uniform `16:9` artwork cards with custom original SVG art, adaptive 2-col/3-col grid, readable 14px+ copy |
| **Game Player Page** | Player immediately at top (`y=76px`) + bottom control strip + structured specs | Player immediately at top (`y=16px`) + attached bar + `About` spec table | Buried below 340px hero header; bare loading text; no restart; blocks uploaded ZIPs | Player-first theater layout above the fold, attached control bar (Live status, Restart, Theater, Fullscreen, Favorite), structured `How to play` & specs below |
| **Recently Played & Saved** | Account-backed *"My games"* & recent history | Saved/recent cookies & account sync | Local favorites only (no recent play history; broken subtitle on `/favorites`) | Privacy-safe `localStorage` Favorites + Recently Played rail with graceful invalid-slug cleanup |
| **Mobile UX** | 2-col touch grid, sticky search, clean touch controls | Dense touch grid, responsive chrome | Button text wraps (`Explore all / games`), tiny switcher targets, awkward absolute search | Mobile-first responsive header drawer, full-width search bar, clean touch targets (`>= 44px`), comfortable 14–16px typography |

---

## 3. Product Scope Guardrails (What NOT to Copy)
In strict alignment with `docs/01_PRD.md` and `docs/12_Architecture_ADRs.md`, Shrabon Playworks will **not** copy features that violate MVP scope or honesty:
1. **No fake popularity counts, star ratings, vote totals, or play counters** (neither CrazyGames' `1.7M likes` nor Poki's `18.4M` counts; no `ADR-001`/`01_PRD.md` ratings or leaderboards).
2. **No bloated carousels or fake category counts** when the catalog holds 2 original games and 2 categories. Design for honest density that scales smoothly from 2 games to 10+ without empty dead columns.
3. **No public player accounts, friends lists, chat, comments, or ad slots.**
4. **No competitor assets, logos, or copyrighted thumbnails.** Use 100% original Neon Night SVG artwork and project-owned assets.
5. **No collapsing the isolated game origin.** Keep `sandbox="allow-scripts"` and `NEXT_PUBLIC_GAME_ORIGIN` separation strictly intact.
