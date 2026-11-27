import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, dirname, resolve } from "node:path";
import "../load-env.js";
import { closePool, getPool } from "../db.js";

const directory = dirname(fileURLToPath(import.meta.url));
const migrationDirectory = resolve(directory, "../../migrations");

try {
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  const client = await getPool().connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of migrationFiles) {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
      if (applied.rowCount) {
        console.log(`Migration ${name} is already applied`);
        continue;
      }
      const sql = await readFile(resolve(migrationDirectory, name), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [basename(name)]);
        await client.query("COMMIT");
        console.log(`Applied migration ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
} finally {
  await closePool();
}
