import assert from "node:assert/strict";
import { test } from "node:test";
import { ZodError } from "zod";
import { readEnvironment } from "../src/env.js";

test("optional contact addresses accept blank values when email delivery is unconfigured", () => {
  const keys = ["DATABASE_URL", "CONTACT_FROM", "CONTACT_TO"] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
  process.env.CONTACT_FROM = "";
  process.env.CONTACT_TO = "";

  try {
    const environment = readEnvironment();
    assert.equal(environment.CONTACT_FROM, undefined);
    assert.equal(environment.CONTACT_TO, undefined);
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("production storage requires a private-preview signing secret", () => {
  const values: Record<string, string> = {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://localhost:5432/test",
    GAME_STORAGE_DRIVER: "s3",
    GAME_STORAGE_S3_ENDPOINT: "https://objects.example.test",
    GAME_STORAGE_S3_BUCKET: "test-bucket",
    GAME_STORAGE_S3_ACCESS_KEY_ID: "test-access-key",
    GAME_STORAGE_S3_SECRET_ACCESS_KEY: "test-secret-key",
    GAME_PREVIEW_TOKEN_SECRET: "",
  };
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) process.env[key] = value;

  try {
    assert.throws(readEnvironment, (error: unknown) =>
      error instanceof ZodError &&
      error.issues.some((issue) => issue.path.includes("GAME_PREVIEW_TOKEN_SECRET")),
    );
  } finally {
    for (const key of Object.keys(values)) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
