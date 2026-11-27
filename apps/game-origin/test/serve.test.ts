import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { serveGameAsset, type GameOriginEnvironment, type R2BucketLike } from "../src/serve.ts";

const ASSET_ID = "123e4567-e89b-42d3-a456-426614174000";
const SECRET = "a-test-preview-secret-that-is-at-least-thirty-two-characters";
const SITE_ORIGIN = "https://shrabon-playworks.pages.dev";

function previewToken(assetId = ASSET_ID, seconds = 300): string {
  const expiresAt = Math.floor(Date.now() / 1000) + seconds;
  const signature = createHmac("sha256", SECRET)
    .update(`${assetId}.${expiresAt}`)
    .digest("base64url");
  return `${expiresAt}.${signature}`;
}

function bucket(objects: Map<string, Uint8Array>, failure?: Error): R2BucketLike {
  return {
    async get(key) {
      if (failure) throw failure;
      const body = objects.get(key);
      return body
        ? { body: new ReadableStream({ start(controller) { controller.enqueue(body); controller.close(); } }) }
        : null;
    },
  };
}

function environment(objects: Map<string, Uint8Array>, failure?: Error): GameOriginEnvironment {
  return { GAME_ASSETS: bucket(objects, failure), MAIN_SITE_ORIGIN: SITE_ORIGIN, PREVIEW_TOKEN_SECRET: SECRET };
}

test("published packages serve correct MIME, cache, isolation headers, and no manifest", async () => {
  const objects = new Map([
    [`packages/${ASSET_ID}/index.html`, new TextEncoder().encode("<!doctype html><title>Published</title>")],
    [`staging/${ASSET_ID}/index.html`, new TextEncoder().encode("<!doctype html><title>Draft</title>")],
  ]);
  const env = environment(objects);

  const response = await serveGameAsset(
    new Request(`https://games.pages.dev/packages/${ASSET_ID}/index.html`),
    env,
    "published",
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(response.headers.get("content-security-policy")?.includes(`frame-ancestors ${SITE_ORIGIN}`), true);
  assert.equal(response.headers.get("cross-origin-resource-policy"), "cross-origin");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.match(await response.text(), /Published/);

  const draft = await serveGameAsset(
    new Request(`https://games.pages.dev/packages/${ASSET_ID}/index.html`),
    environment(new Map([[`staging/${ASSET_ID}/index.html`, objects.get(`staging/${ASSET_ID}/index.html`)!]])),
    "published",
  );
  assert.equal(draft.status, 404);
  const manifest = await serveGameAsset(
    new Request(`https://games.pages.dev/packages/${ASSET_ID}/playworks.json`),
    env,
    "published",
  );
  assert.equal(manifest.status, 404);
});

test("staged assets require a valid scoped preview token and are never cacheable", async () => {
  const objects = new Map([[`staging/${ASSET_ID}/index.html`, new TextEncoder().encode("<title>Draft</title>")]]);
  const env = environment(objects);
  const invalid = await serveGameAsset(
    new Request(`https://games.pages.dev/preview/${ASSET_ID}/invalid/index.html`),
    env,
    "preview",
  );
  assert.equal(invalid.status, 404);

  const token = previewToken();
  const preview = await serveGameAsset(
    new Request(`https://games.pages.dev/preview/${ASSET_ID}/${token}/index.html`),
    env,
    "preview",
  );
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get("cache-control"), "private, no-store");
  assert.match(await preview.text(), /Draft/);

  const expired = await serveGameAsset(
    new Request(`https://games.pages.dev/preview/${ASSET_ID}/${previewToken(ASSET_ID, -1)}/index.html`),
    env,
    "preview",
  );
  assert.equal(expired.status, 404);
});

test("unsafe paths, wrong methods, and storage failures are handled explicitly", async () => {
  const env = environment(new Map());
  for (const path of [
    `packages/${ASSET_ID}/%2e%2e/index.html`,
    `packages/${ASSET_ID}/%2fetc/passwd`,
    `packages/${ASSET_ID}/missing.exe`,
    `packages/${ASSET_ID}/.hidden.js`,
  ]) {
    assert.equal(
      (await serveGameAsset(new Request(`https://games.pages.dev/${path}`), env, "published")).status,
      404,
    );
  }

  assert.equal(
    (await serveGameAsset(
      new Request(`https://games.pages.dev/packages/${ASSET_ID}/index.html`, { method: "POST" }),
      env,
      "published",
    )).status,
    405,
  );

  const failed = await serveGameAsset(
    new Request(`https://games.pages.dev/packages/${ASSET_ID}/index.html`),
    environment(new Map(), new Error("storage offline")),
    "published",
  );
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("cache-control"), "private, no-store");
});
