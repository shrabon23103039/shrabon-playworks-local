import "../load-env.js";
import argon2 from "argon2";
import { z } from "zod";
import { closePool, getPool } from "../db.js";

const input = z.object({
  ADMIN_EMAIL: z.string().email().transform((email) => email.trim().toLowerCase()),
  ADMIN_PASSWORD: z.string().min(14).max(256),
  ADMIN_DISPLAY_NAME: z.string().trim().min(1).max(100).default("Shrabon Playworks Admin"),
}).parse(process.env);

try {
  const pool = getPool();
  const existing = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM admin_users");
  if (Number(existing.rows[0]?.count ?? 0) > 0) {
    throw new Error("An administrator already exists; bootstrap will not replace credentials");
  }

  const passwordHash = await argon2.hash(input.ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  await pool.query(
    "INSERT INTO admin_users (email, password_hash, display_name) VALUES ($1, $2, $3)",
    [input.ADMIN_EMAIL, passwordHash, input.ADMIN_DISPLAY_NAME],
  );
  console.log(`Created the private administrator ${input.ADMIN_EMAIL}`);
} finally {
  await closePool();
}
