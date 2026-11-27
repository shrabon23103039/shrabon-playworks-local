# 17 — Player and Administrator User Guide

## Language
Choose English or বাংলা using the language switcher. The selected language applies to supported interface text. Some individual game content may only be available in one language if translations have not been supplied; the interface must make fallback behavior clear.

## Player
Open home, browse/search, choose a category, open a game detail page, read instructions, play, use fullscreen if supported, and optionally favorite the game. Favorites are local to that browser/device and are not synced.

## Administrator
Sign in through private admin login; create/edit draft; add metadata/assets; validate; preview while authenticated; publish validated revision; inspect revision history and roll back. Admin UI supports English and Bangla.

Game packages are ZIP archives with root `index.html` and `playworks.json` containing `{"version":1,"entry":"index.html"}`. Uploads are staged privately and validated before publication. Keep the two original bundled games as the honest starter catalog; do not describe them as owner-supplied content unless verified.

Local development setup and current deployment constraints are documented in the root README and `docs/EXECUTION_STATE.md`. Public deployment is not available until durable shared game-asset storage and owner-controlled provider setup are complete.
