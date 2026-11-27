# Shrabon Playworks

Founder: Shrabon Biswas. Product: independent portal for original HTML5 browser games.

The local MVP includes a Next.js web/admin app, Express API, PostgreSQL schema/migrations, an isolated game-origin server, bilingual UI, and two original playable games. Public deployment has not occurred; see `docs/EXECUTION_STATE.md`.

## Local development

Requirements verified for this workspace: Node.js 24.21.0 and npm 11.19.0. Use a local PostgreSQL database.

1. Install the pinned dependencies with `npm ci`.
2. Copy `.env.example` to `.env`; configure `DATABASE_URL`, `ADMIN_EMAIL`, an `ADMIN_PASSWORD` of at least 14 characters, and a random `GAME_PREVIEW_TOKEN_SECRET` of at least 32 characters.
3. Keep `RESEND_API_KEY`, `CONTACT_FROM`, and `CONTACT_TO` blank to leave email delivery disabled.
4. Apply migrations, seed the two original games as drafts, and create the one-time administrator:

   ```sh
   npm run db:migrate
   npm run db:seed
   npm run admin:bootstrap
   ```

5. Start the web app, API, and dedicated game origin with `npm run dev`. Local URLs are `http://localhost:3000`, `http://localhost:4000`, and `http://localhost:4002`.

Useful checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit`.

## Status and constraints

The local asset pipeline uses a shared filesystem for development only. Production deployment is blocked until durable shared object storage is implemented and provider/release gates pass. Render's reviewed free instances are not suitable for production; no provider accounts or public deployment were created. Do not spend money, enter payment details, purchase a domain, or bypass account verification. See `docs/FREE_DEPLOYMENT_AUDIT.md` and `docs/06_Plan.md`.

Security invariants: dedicated game origin with strict isolation; no public draft previews; no public player accounts in MVP; no persistent visitor IDs or fingerprinting; raw analytics retention no longer than 90 days; secrets never enter frontend bundles or logs.

The Neon Night palette is approved by the owner. English (default) and Bangla UI support are approved for the MVP.

Status vocabulary: Approved, Proposed, Conditional, Pending, Deferred, Not authorized. Read `CLAUDE.md` and `.cursorrules` before agent work. Implementation/publication authorization is recorded in the docs; spending, payment details, paid upgrades and bypassing external account verification remain prohibited.


## Documentation

Read `CLAUDE.md`, `.cursorrules`, and `docs/AUTONOMOUS_IMPLEMENTATION.md` before further agent work. The maintained progress checkpoint is `docs/EXECUTION_STATE.md`.
