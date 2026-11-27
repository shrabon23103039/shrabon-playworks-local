# Design System — Shrabon Playworks (Neon Night v2)

**Status:** Approved baseline (`ADR-012`, `03_UI_Spec.md`) refined for production UI quality and bilingual English/Bangla legibility.

---

## 1. Color Tokens (Neon Night)

| Token | CSS Variable | Hex | Role |
|---|---|---|---|
| `bg-canvas` | `--bg-canvas` | `#10111B` | Primary viewport background |
| `bg-elevated` | `--bg-elevated` | `#141625` | Header, footer, input wells, side panels |
| `surface-1` | `--surface-1` | `#191B2E` | Cards, player shell, admin panels |
| `surface-2` | `--surface-2` | `#22253B` | Hover surfaces, active tabs, secondary controls |
| `border-subtle` | `--border-subtle` | `#30334B` | Hairline borders (`1px`), table dividers |
| `border-strong` | `--border-strong` | `#464A6B` | Input focus / interactive hover border |
| `text-primary` | `--text-primary` | `#F5F5FA` | Headings, card titles, primary labels |
| `text-secondary` | `--text-secondary` | `#A5A7BA` | Body copy, descriptions, nav items |
| `text-muted` | `--text-muted` | `#8488A3` | Metadata & timestamps (contrast-tuned >= 4.8:1 on `#191B2E`) |
| `brand-primary` | `--brand-primary` | `#8057FF` | Primary CTAs, active chips, focus accents |
| `brand-primary-hover` | `--brand-primary-hover` | `#916DFF` | Primary CTA hover |
| `brand-secondary` | `--brand-secondary` | `#35B8FF` | Focus rings, secondary links, active player indicator |
| `accent-pink` | `--accent-pink` | `#FF5C9A` | Favorite heart active state & small badge highlights only |
| `success` | `--success` | `#35C98A` | Published badge, live status dot, validation success |
| `warning` | `--warning` | `#F4B740` | Draft badge, fallback/storage notices |
| `danger` | `--danger` | `#FF647C` | Destructive actions, inline error states |

> **Contrast Rule:** `--text-muted` is shifted from `#777B95` to `#8488A3` for WCAG 2.2 AA (>= 4.5:1) on `#191B2E` and `#10111B` surfaces while staying faithful to Neon Night. Never use raw neon accents for multi-line body prose.

---

## 2. Typography Scale & Bilingual Rules

- **Font Stack:** `"Noto Sans Bengali", "Noto Sans", "Segoe UI", system-ui, -apple-system, Arial, sans-serif` (locally bundled `@fontsource/noto-sans-bengali` weights `400`, `600`, `700`).
- **Type Scale (`03_UI_Spec.md` aligned):**
  - `12px` (`0.75rem`) — Captions, eyebrows, badges, metadata (strict floor: **no text smaller than 12px**)
  - `14px` (`0.875rem`) — Secondary labels, card descriptions, table cells, buttons, inputs
  - `16px` (`1rem`) — Base body copy (`line-height: 1.6`)
  - `18px` (`1.125rem`) — Card titles, sub-headings
  - `20px` (`1.25rem`) — Panel headings
  - `24px` (`1.5rem`) — Section titles (`line-height: 1.25`)
  - `32px` (`2rem`) — Page titles (`line-height: 1.2`)
  - `40px` (`2.5rem`) — Display / hero heading (`line-height: 1.15`)
- **Bangla Typography Guardrails:**
  - Never apply aggressive negative tracking (`letter-spacing < -0.02em`) globally so Bangla conjuncts (`যুক্তবর্ণ`) and matras never collide.
  - Use `line-height: 1.6` for body and `>= 1.2` for headings; allow flexible card heights with `line-clamp: 2` only on descriptions with comfortable line-height so ascenders/descenders never clip.

---

## 3. Spacing, Layout & Radii

- **Spacing Scale (`4px` base):** `4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px`.
- **Container Widths:**
  - Storefront / Player max width: `1360px` (within `1440px` guideline)
  - Narrow prose / Contact / Legal: `760px`
  - Admin workspace: `1160px` (Login card: `460px`)
- **Page Gutters:** `32px` desktop (`>= 1024px`), `24px` tablet (`768–1023px`), `16px` mobile (`< 768px`).
- **Border Radii:**
  - `8px` — Badges, compact chips, table pills
  - `10px` — Buttons, form inputs, icon buttons
  - `14px` — Cards, info panels, player container
  - `18px` — Featured spotlight banner, modal dialogs
  - `9999px` — Category filter pills, status dots
- **Elevation & Borders:** Flat dark surfaces differentiated by luminance step (`#10111B` -> `#141625` -> `#191B2E` -> `#22253B`) and `1px solid #30334B` borders, with restrained shadow (`0 12px 32px rgba(0, 0, 0, 0.35)`) only on elevated popovers, modals, and hovered cards. No excessive neon border glows.

---

## 4. Component Specifications

### Buttons (`min-height: 40px` desktop / `44px` touch targets)
- **Primary:** `#8057FF` solid background, `#FFFFFF` text, hover `#916DFF`, active `scale(0.99)`.
- **Secondary:** `#22253B` surface, `1px solid #30334B`, `#F5F5FA` text, hover `#2B2F4B`.
- **Ghost:** Transparent background, `#A5A7BA` text, hover `#FFFFFF0D` and `#F5F5FA` text.
- **Danger:** `rgba(255, 100, 124, 0.12)` background, `1px solid rgba(255, 100, 124, 0.45)`, `#FFB3BF` text.
- **Focus State (All interactive elements):** `2px solid #35B8FF` with `2px` offset (`:focus-visible`).

### Game Cards
- **Aspect Ratio:** Consistent `16:9` artwork frame (`aspect-ratio: 16 / 9`) inside every grid and carousel.
- **Art Source:** Dedicated original SVG cover artwork per game (`Meteor Dash` starfighter & meteors; `Orbit Memory` planetary orbital cards) plus deterministic category-themed SVG vector cover generator for uploaded packages.
- **Card Content:** Category badge + localized title (`18px`) + concise 2-line description (`14px`) + single clear `Play` affordance + top-right Favorite toggle (`40×40px` hit target).
- **Adaptive Grid:** Uses `repeat(auto-fit, minmax(min(100%, 300px), 1fr))` capped cleanly so 2 games fill a balanced 2-column row on desktop without leaving a dead empty third column, and scales cleanly to 3–4 columns as the catalog grows.

### Iconography
- Single consistent icon library: `lucide-react` (`16px` inline, `18px` nav/buttons, `20px` header actions, `24px` empty states).
- Zero emoji (`🎮`, `🔥`) or decorative Unicode glyphs (`✦`, `◈`, `✧`) used as UI icons.

### Motion & Accessibility
- Subtle `150ms–200ms cubic-bezier(0.2, 0.8, 0.2, 1)` transitions for hover lift (`-2px`) and border shifts.
- `@media (prefers-reduced-motion: reduce)` collapses all transitions and transforms to instant state changes.
- Target WCAG 2.2 AA across contrast, keyboard navigation, visible focus rings, `aria-live` status updates, semantic landmarks, and focus-trapped dialogs.

---

## 5. Responsive Breakpoints
- `320px–479px` (Small & Standard Mobile: single-column cards, compact top bar + full-width drawer & expandable search bar, `44px` touch targets)
- `480px–767px` (Large Mobile: 2-column compact cards or balanced 1–2 col, responsive player bar)
- `768px–1023px` (Tablet: 2-column catalog grid, compact nav, inline search)
- `1024px–1279px` (Laptop: full horizontal nav, 2–3 column adaptive grid, theater player)
- `1280px–1440px+` (Desktop / Wide Desktop: `1360px` container max width, crisp spacing)

---

## 6. Asset Gap & Thumbnail Plan
- **Current Gap:** The backend schema (`05_Schema.md`, `10_API_Contract.md`) stores `entry_path` and localized text metadata, with no `thumbnail_url` or uploaded cover image endpoint.
- **MVP Solution:** Provide bespoke, original vector SVG artwork (`apps/web/src/components/game-artwork.tsx`) for `meteor-dash` and `orbit-memory`, plus a deterministic category-aware SVG art system for future ZIP-uploaded games so zero broken images or stock photos ever appear.
- **Future Post-MVP Extension:** Add optional `cover.png`/`cover.webp` extraction from `playworks.json` manifest inside `apps/api/src/game-assets.ts` and serve from the isolated origin.
