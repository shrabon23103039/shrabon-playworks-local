import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request } from "express";
import {
  createGamePreviewToken,
  createOpaqueToken,
  getCookie,
  isValidGameEntryPath,
  isValidGamePreviewToken,
  sha256,
} from "../src/security.js";

test("session and CSRF tokens are unguessable opaque values", () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.equal(sha256(first).length, 64);
  assert.equal(sha256(first), sha256(first));
});

test("cookie parser handles unrelated cookies and malformed escapes safely", () => {
  const request = {
    headers: { cookie: "theme=dark; sp_csrf=token%2Bvalue; broken=%E0%A4%A" },
  } as Request;
  assert.equal(getCookie(request, "sp_csrf"), "token+value");
  assert.equal(getCookie(request, "missing"), undefined);
  assert.equal(getCookie(request, "broken"), undefined);
});

test("game entries are restricted to built-ins or immutable package identifiers", () => {
  assert.equal(isValidGameEntryPath("/games/meteor-dash/index.html"), true);
  assert.equal(isValidGameEntryPath("/games/orbit-memory/index.html"), true);
  assert.equal(isValidGameEntryPath("/packages/123e4567-e89b-42d3-a456-426614174000/index.html"), true);
  assert.equal(isValidGameEntryPath("../../admin/index.html"), false);
  assert.equal(isValidGameEntryPath("https://example.invalid/game.html"), false);
  assert.equal(isValidGameEntryPath("/games/meteor-dash/../admin.html"), false);
  assert.equal(isValidGameEntryPath("/packages/../../admin/index.html"), false);
});

test("private preview tokens are scoped to one package and expire", () => {
  const assetId = "123e4567-e89b-42d3-a456-426614174000";
  const secret = "test-secret-with-more-than-thirty-two-characters";
  const now = 1_800_000_000_000;
  const token = createGamePreviewToken(assetId, secret, now);
  assert.equal(isValidGamePreviewToken(assetId, token, secret, now), true);
  assert.equal(isValidGamePreviewToken("223e4567-e89b-42d3-a456-426614174000", token, secret, now), false);
  assert.equal(isValidGamePreviewToken(assetId, token, secret, now + 301_000), false);
  assert.equal(isValidGamePreviewToken(assetId, token, "wrong-secret-with-more-than-thirty-two", now), false);
});
