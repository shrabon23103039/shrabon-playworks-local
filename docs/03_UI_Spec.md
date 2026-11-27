# 03 — UI Specification

## 1. Approved visual direction
**Neon Night — APPROVED by owner.** Premium dark gaming portal, vibrant game artwork, restrained neon accents. The exact palette below is the approved design baseline.

## 2. Approved color tokens
| Token | Hex | Usage |
|---|---|---|
| `bg-canvas` | `#10111B` | Main page background |
| `bg-elevated` | `#141625` | Elevated page regions |
| `surface-1` | `#191B2E` | Cards and panels |
| `surface-2` | `#22253B` | Hover/raised surfaces |
| `border-subtle` | `#30334B` | Borders and dividers |
| `text-primary` | `#F5F5FA` | Main text |
| `text-secondary` | `#A5A7BA` | Supporting text |
| `text-muted` | `#777B95` | Metadata |
| `brand-primary` | `#8057FF` | Primary CTA and active state |
| `brand-secondary` | `#35B8FF` | Links and secondary accent |
| `accent-pink` | `#FF5C9A` | Small highlights only |
| `success` | `#35C98A` | Success state |
| `warning` | `#F4B740` | Warning state |
| `danger` | `#FF647C` | Error/destructive state |

Use accent colors sparingly. Game artwork should supply most visual variety. Do not use neon colors for long body text.

## 3. Typography
- UI font: choose a font stack with reliable Latin and Bangla glyph coverage; verify font licensing and rendering before implementation.
- Use a Bangla-capable fallback such as Noto Sans Bengali where appropriate, subject to current font source/license verification.
- Scale: 12, 14, 16, 18, 20, 24, 32, 40, 48 px.
- Body line height: 1.5 minimum; headings 1.1–1.3, adjusted for Bangla shaping and line wrapping.
- Test mixed English/Bangla text, punctuation, numerals and fallback consistency.

## 4. Language support — English and Bangla in MVP
- Both English and Bangla UI are required in the MVP.
- Provide a visible language switcher in the main navigation and a discoverable setting on mobile.
- The default language is **not yet decided**; do not assume English or Bangla is the default.
- Translate navigation, buttons, labels, validation messages, empty/error/success states, admin UI, contact form, privacy/terms UI and game instructions where project-owned text is displayed.
- Use translation keys rather than hard-coded UI strings.
- Keep language resources separate and reviewed by a fluent Bangla speaker.
- Support Bangla text input, search, sorting, truncation, line wrapping, and accessible names.
- Store only the user's language preference locally if persistence is needed; do not turn it into a visitor identity.
- Do not automatically infer a user's language from sensitive or unnecessary data.
- Game titles/descriptions may have per-language variants; define fallback behavior in content schema before implementation.
- Use Unicode/UTF-8 end to end.

## 5. Typography and layout
Base spacing unit: 4 px. Tokens: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Main content max width: proposed 1440 px.
- Desktop gutter: 32 px; tablet 24 px; mobile 16 px.
- Game grid uses responsive CSS grid; card aspect ratios consistent within a section.
- Allow flexible card heights or controlled line clamping so Bangla text is not clipped.

## 6. Responsive breakpoints
Proposed: 360, 480, 768, 1024, 1280, 1440 px. Use content-driven breakpoints and test actual layouts.

## 7. Components and states
- Game card: default, hover, keyboard focus, loading skeleton, unavailable.
- Button: primary, secondary, ghost, danger; default, hover, focus, pressed, disabled, loading.
- Search: idle, focused, populated, no results, error.
- Category chip: default, selected, hover, focus.
- Player: idle, loading, playing, fullscreen, error.
- Language switcher: English selected, Bangla selected, keyboard focus, pending locale load.
- Dialog: open/closed, focus trap, Escape handling where safe.
- Admin table: loading, empty, populated, error, pagination.

## 8. Game artwork
Use original game artwork or assets with documented rights. Preserve aspect ratio; use consistent thumbnail crop. Never use copyrighted competitor assets or scraped game images without permission.

## 9. Motion and accessibility
Short, purposeful transitions; respect `prefers-reduced-motion`. Avoid constant animated backgrounds, flashing or distracting effects. Target WCAG 2.2 AA. Verify contrast, keyboard navigation, visible focus, semantic markup, screen-reader labels, and Bangla text rendering.

## 10. Theme
MVP launches with approved dark Neon Night theme. Light theme is not required unless separately approved.
