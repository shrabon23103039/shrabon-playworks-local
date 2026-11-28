import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { ADMIN_BASE_PATH, adminRoutes } from "../src/lib/admin-routes";

const webRoot = resolve(import.meta.dirname, "..");

test("private admin route uses a non-default randomized prefix", () => {
  assert.notEqual(ADMIN_BASE_PATH, "/admin");
  assert.match(ADMIN_BASE_PATH, /^\/studio-[0-9a-f]{16}$/);
  assert.equal(adminRoutes.dashboard(), ADMIN_BASE_PATH);
  assert.equal(adminRoutes.login(), `${ADMIN_BASE_PATH}/login`);
  assert.equal(adminRoutes.games(), `${ADMIN_BASE_PATH}/games`);
  assert.equal(adminRoutes.newGame(), `${ADMIN_BASE_PATH}/games/new`);
  assert.equal(adminRoutes.editGame("abc"), `${ADMIN_BASE_PATH}/games/abc/edit`);
  assert.equal(adminRoutes.previewGame("abc"), `${ADMIN_BASE_PATH}/games/abc/preview`);
  assert.equal(adminRoutes.revisions("abc"), `${ADMIN_BASE_PATH}/games/abc/revisions`);
});

test("legacy /admin app routes are removed so Next.js returns 404 and new routes exist", () => {
  assert.equal(existsSync(resolve(webRoot, "src/app/admin")), false);
  const baseDir = resolve(webRoot, `src/app${ADMIN_BASE_PATH}`);
  for (const file of [
    "layout.tsx",
    "page.tsx",
    "login/page.tsx",
    "games/page.tsx",
    "games/new/page.tsx",
    "games/[id]/edit/page.tsx",
    "games/[id]/preview/page.tsx",
    "games/[id]/revisions/page.tsx",
  ]) {
    assert.equal(existsSync(resolve(baseDir, file)), true, `Missing ${file}`);
  }
});

test("public navigation and SEO files do not expose the private admin route", () => {
  const siteShell = readFileSync(resolve(webRoot, "src/components/site-shell.tsx"), "utf8");
  assert.equal(siteShell.includes(ADMIN_BASE_PATH), false);
  assert.equal(siteShell.includes("/admin"), false);
  assert.equal(existsSync(resolve(webRoot, "public/robots.txt")), false);
  assert.equal(existsSync(resolve(webRoot, "src/app/robots.ts")), false);
  assert.equal(existsSync(resolve(webRoot, "src/app/sitemap.ts")), false);
});

test("API server continues enforcing requireAdmin and requireCsrf on /api/v1/admin", () => {
  const apiServer = readFileSync(resolve(webRoot, "../api/src/server.ts"), "utf8");
  assert.equal(apiServer.includes("adminRouter.use(requireAdmin)"), true);
  assert.equal(apiServer.includes("requireCsrf(request, response, next)"), true);
  assert.equal(apiServer.includes('api.use("/admin", adminRouter)'), true);
});
