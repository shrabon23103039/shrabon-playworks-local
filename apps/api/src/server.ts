import "./load-env.js";
import argon2 from "argon2";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { randomUUID, randomBytes } from "node:crypto";
import { z } from "zod";
import { closePool, getPool } from "./db.js";
import { readEnvironment } from "./env.js";
import { LocalGameAssetStorage, createS3GameAssetStorage } from "./game-storage.js";
import {
  discardStagedGamePackage,
  GamePackageError,
  MAX_GAME_ARCHIVE_BYTES,
  publishGamePackage,
  stageGamePackage,
  unpublishGamePackage,
} from "./game-assets.js";
import {
  clearAuthCookies,
  createOpaqueToken,
  createGamePreviewToken,
  getGamePackageId,
  getCookie,
  isValidGameEntryPath,
  setAuthCookies,
  sha256,
} from "./security.js";

const config = readEnvironment();
const app = express();
const pool = getPool();
const api = express.Router();
const gameAssetStorage = config.GAME_STORAGE_DRIVER === "s3"
  ? createS3GameAssetStorage({
    endpoint: config.GAME_STORAGE_S3_ENDPOINT ?? "",
    region: config.GAME_STORAGE_S3_REGION,
    bucket: config.GAME_STORAGE_S3_BUCKET ?? "",
    accessKeyId: config.GAME_STORAGE_S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: config.GAME_STORAGE_S3_SECRET_ACCESS_KEY ?? "",
  })
  : new LocalGameAssetStorage(config.GAME_ASSET_DIR);
let retentionHealthy = true;
const locales = z.object({
  en: z.string().trim().min(1).max(4000),
  bn: z.string().trim().max(4000).optional(),
});
const GameInput = z.object({
  slug: z.string().trim().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: locales,
  shortDescription: z.object({
    en: z.string().trim().min(1).max(240),
    bn: z.string().trim().max(240).optional(),
  }),
  description: locales,
  instructions: z.object({
    en: z.string().trim().max(2000).optional(),
    bn: z.string().trim().max(2000).optional(),
  }),
  tags: z.array(z.string().trim().min(1).max(24)).max(12),
  categoryId: z.string().uuid(),
  entryPath: z.string().refine(isValidGameEntryPath),
}).strict();
const AdminLogin = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
}).strict();
const ContactInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(4000),
}).strict();
const AnalyticsInput = z.object({
  eventType: z.enum(["game_view", "game_launch", "favorite"]),
  gameSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64).optional(),
}).strict();
const adminLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Try again later." },
});
const contactLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { code: "RATE_LIMITED", message: "Please wait before sending another message." },
});
const gameUploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const dummyPasswordHash = await argon2.hash(randomBytes(32).toString("hex"), {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
});

type AdminIdentity = { id: string; email: string; displayName: string };
type GameRow = {
  id: string;
  slug: string;
  metadata: Record<string, unknown>;
  entry_path: string;
  category_name: Record<string, string>;
  category_slug: string;
  published_at: Date | null;
};

app.disable("x-powered-by");
app.set("trust proxy", config.NODE_ENV === "production" ? 1 : false);
app.use((request, response, next) => {
  response.locals.requestId = randomUUID();
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: config.WEB_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  maxAge: 600,
}));
app.use(express.json({ limit: "32kb", strict: true }));
app.use("/api", rateLimit({
  windowMs: 60_000,
  limit: 180,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));

function sendError(
  response: express.Response,
  status: number,
  code: string,
  message: string,
): void {
  response.status(status).json({
    code,
    message,
    requestId: response.locals.requestId,
  });
}

function requireSameOrigin(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): void {
  if (request.get("origin") !== config.WEB_ORIGIN) {
    sendError(response, 403, "ORIGIN_REJECTED", "Request origin is not allowed.");
    return;
  }
  next();
}

async function requireAdmin(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  const token = getCookie(request, "sp_session");
  if (!token) {
    sendError(response, 401, "UNAUTHORIZED", "Administrator sign-in is required.");
    return;
  }
  try {
    const result = await pool.query<{
      id: string;
      email: string;
      display_name: string;
      session_id: string;
      csrf_hash: string;
    }>(
      `SELECT u.id, u.email, u.display_name, s.id AS session_id, s.csrf_hash
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
      [sha256(token)],
    );
    const row = result.rows[0];
    if (!row) {
      clearAuthCookies(response);
      sendError(response, 401, "UNAUTHORIZED", "Administrator sign-in is required.");
      return;
    }

    response.locals.adminUser = {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
    } satisfies AdminIdentity;
    response.locals.adminSession = { id: row.session_id, csrfHash: row.csrf_hash };
    next();
  } catch (error) {
    next(error);
  }
}

function requireCsrf(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): void {
  const cookie = getCookie(request, "sp_csrf");
  const header = request.get("x-csrf-token");
  const session = response.locals.adminSession as { csrfHash: string } | undefined;
  if (!cookie || !header || cookie !== header || !session || sha256(cookie) !== session.csrfHash) {
    sendError(response, 403, "CSRF_REJECTED", "The request could not be verified.");
    return;
  }
  next();
}

function audit(
  admin: AdminIdentity,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, string | number>,
): Promise<unknown> {
  return pool.query(
    `INSERT INTO admin_audit_events (admin_user_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [admin.id, action, targetType, targetId, JSON.stringify(metadata)],
  );
}

function publicGame(row: GameRow) {
  return {
    slug: row.slug,
    ...row.metadata,
    entryPath: row.entry_path,
    category: row.category_name,
    categorySlug: row.category_slug,
    publishedAt: row.published_at,
  };
}

const publicGameSelect = `
  SELECT g.id, g.slug, r.metadata_snapshot AS metadata, r.entry_path,
         c.name AS category_name, c.slug AS category_slug, g.published_at
  FROM games g
  JOIN game_revisions r ON r.id = g.active_revision_id AND r.game_id = g.id
  JOIN categories c ON c.id = (r.metadata_snapshot ->> 'categoryId')::uuid
  WHERE g.status = 'published' AND c.is_active = true
`;

api.get("/healthz", async (_request, response) => {
  await pool.query("SELECT 1");
  if (!retentionHealthy) {
    sendError(response, 503, "RETENTION_UNHEALTHY", "A required data-retention task is not healthy.");
    return;
  }
  response.json({ status: "ok" });
});

api.get("/categories", async (_request, response) => {
  const result = await pool.query(
    "SELECT slug, name FROM categories WHERE is_active = true ORDER BY sort_order, slug",
  );
  response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  response.json({ categories: result.rows });
});

api.get("/games", async (request, response) => {
  const search = typeof request.query.q === "string" ? request.query.q.normalize("NFC").trim() : "";
  const category = typeof request.query.category === "string" ? request.query.category : undefined;
  const exclude = typeof request.query.exclude === "string" ? request.query.exclude : undefined;
  const limitInput = Number(request.query.limit ?? 24);
  const limit = Number.isFinite(limitInput) ? Math.min(48, Math.max(1, Math.floor(limitInput))) : 24;
  const values: unknown[] = [];
  let where = publicGameSelect;
  if (search) {
    values.push(`%${search}%`);
    const index = values.length;
    where += ` AND (g.slug ILIKE $${index} OR r.metadata_snapshot::text ILIKE $${index})`;
  }
  if (category) {
    values.push(category);
    where += ` AND c.slug = $${values.length}`;
  }
  if (exclude) {
    values.push(exclude);
    where += ` AND g.slug <> $${values.length}`;
  }
  values.push(limit);
  const result = await pool.query<GameRow>(
    `${where} ORDER BY g.published_at DESC NULLS LAST, g.slug LIMIT $${values.length}`,
    values,
  );
  response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  response.json({ games: result.rows.map(publicGame) });
});

api.get("/games/:slug", async (request, response) => {
  const result = await pool.query<GameRow>(
    `${publicGameSelect} AND g.slug = $1 LIMIT 1`,
    [request.params.slug],
  );
  const row = result.rows[0];
  if (!row) {
    sendError(response, 404, "NOT_FOUND", "This game is not available.");
    return;
  }
  response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  response.json({ game: publicGame(row) });
});

api.post("/contact", requireSameOrigin, contactLimit, async (request, response) => {
  const parsed = ContactInput.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "VALIDATION_FAILED", "Check the form fields and try again.");
    return;
  }
  if (!config.RESEND_API_KEY || !config.CONTACT_FROM || !config.CONTACT_TO) {
    sendError(response, 503, "CONTACT_UNAVAILABLE", "Contact delivery is temporarily unavailable.");
    return;
  }

  const { name, email, message } = parsed.data;
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 8_000);
  try {
    const delivery = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: abort.signal,
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.CONTACT_FROM,
        to: [config.CONTACT_TO],
        reply_to: email,
        subject: "Shrabon Playworks contact message",
        text: `From: ${name}\nReply email: ${email}\n\n${message}`,
        html: `<p>From: ${escapeHtml(name)}</p><p>Reply email: ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
      }),
    });
    if (!delivery.ok) {
      sendError(response, 502, "CONTACT_DELIVERY_FAILED", "The message could not be delivered. Please try again later.");
      return;
    }
    response.status(202).json({ sent: true });
  } catch {
    sendError(response, 502, "CONTACT_DELIVERY_FAILED", "The message could not be delivered. Please try again later.");
  } finally {
    clearTimeout(timeout);
  }
});

api.post("/analytics", requireSameOrigin, async (request, response) => {
  const parsed = AnalyticsInput.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "VALIDATION_FAILED", "The analytics event is not supported.");
    return;
  }
  const slug = parsed.data.gameSlug ?? "";
  if (slug) {
    const published = await pool.query(
      "SELECT 1 FROM games WHERE slug = $1 AND status = 'published' AND active_revision_id IS NOT NULL",
      [slug],
    );
    if (!published.rowCount) {
      sendError(response, 404, "NOT_FOUND", "This game is not available.");
      return;
    }
  }
  await pool.query(
    `INSERT INTO daily_analytics_aggregates (event_date, event_type, game_slug, event_count)
     VALUES ((now() AT TIME ZONE 'UTC')::date, $1, $2, 1)
     ON CONFLICT (event_date, event_type, game_slug)
     DO UPDATE SET event_count = daily_analytics_aggregates.event_count + 1`,
    [parsed.data.eventType, slug],
  );
  response.status(202).json({ accepted: true });
});

api.post("/admin/session", requireSameOrigin, adminLimit, async (request, response) => {
  const parsed = AdminLogin.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "VALIDATION_FAILED", "Enter a valid email and password.");
    return;
  }
  const account = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    display_name: string;
  }>(
    "SELECT id, email, password_hash, display_name FROM admin_users WHERE email = $1",
    [parsed.data.email],
  );
  const row = account.rows[0];
  const valid = await argon2.verify(row?.password_hash ?? dummyPasswordHash, parsed.data.password);
  if (!row || !valid) {
    sendError(response, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    return;
  }

  const sessionToken = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  const maxAge = config.SESSION_TTL_HOURS * 60 * 60;
  await pool.query(
    `INSERT INTO admin_sessions (admin_user_id, token_hash, csrf_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 * interval '1 second'))`,
    [row.id, sha256(sessionToken), sha256(csrfToken), maxAge],
  );
  await pool.query("UPDATE admin_users SET last_login_at = now() WHERE id = $1", [row.id]);
  setAuthCookies(response, sessionToken, csrfToken, maxAge);
  response.json({ admin: { id: row.id, email: row.email, displayName: row.display_name } });
});

api.get("/admin/session", requireAdmin, async (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json({ admin: response.locals.adminUser });
});

const adminRouter = express.Router();
adminRouter.use(requireAdmin);
adminRouter.use((request, response, next) => {
  if (["POST", "PATCH", "DELETE"].includes(request.method)) {
    requireCsrf(request, response, next);
    return;
  }
  next();
});
adminRouter.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

adminRouter.delete("/session", async (_request, response) => {
  const session = response.locals.adminSession as { id: string };
  await pool.query("UPDATE admin_sessions SET revoked_at = now() WHERE id = $1", [session.id]);
  clearAuthCookies(response);
  response.status(204).end();
});

adminRouter.get("/categories", async (_request, response) => {
  const result = await pool.query(
    "SELECT id, slug, name FROM categories WHERE is_active = true ORDER BY sort_order, slug",
  );
  response.json({ categories: result.rows });
});

adminRouter.get("/games", async (request, response) => {
  const search = typeof request.query.q === "string" ? request.query.q.normalize("NFC").trim() : "";
  const values: unknown[] = [];
  let sql = `
    SELECT g.id, g.slug, g.title, g.short_description AS "shortDescription",
           g.description, g.instructions, g.tags, g.category_id AS "categoryId",
           g.entry_path AS "entryPath", g.status, g.validated_at AS "validatedAt",
           g.updated_at AS "updatedAt", g.active_revision_id AS "activeRevisionId",
           c.slug AS "categorySlug", c.name AS "categoryName"
    FROM games g JOIN categories c ON c.id = g.category_id
  `;
  if (search) {
    values.push(`%${search}%`);
    sql += ` WHERE g.slug ILIKE $1 OR g.title::text ILIKE $1`;
  }
  sql += " ORDER BY g.updated_at DESC, g.slug";
  const result = await pool.query(sql, values);
  response.json({ games: result.rows });
});

adminRouter.post(
  "/games/:id/assets",
  gameUploadLimit,
  express.raw({
    type: ["application/zip", "application/x-zip-compressed"],
    limit: MAX_GAME_ARCHIVE_BYTES,
  }),
  async (request, response) => {
    const gameId = z.string().uuid().safeParse(request.params.id);
    if (!gameId.success) {
      sendError(response, 400, "INVALID_GAME_ID", "Choose a valid game.");
      return;
    }
    if (!config.GAME_PREVIEW_TOKEN_SECRET) {
      sendError(response, 503, "GAME_UPLOAD_UNAVAILABLE", "Game package upload is not configured.");
      return;
    }
    if (!Buffer.isBuffer(request.body)) {
      sendError(response, 400, "INVALID_GAME_PACKAGE", "Upload a ZIP package.");
      return;
    }
    const game = await pool.query(
      "SELECT 1 FROM games WHERE id = $1 AND status <> 'archived'",
      [gameId.data],
    );
    if (!game.rowCount) {
      sendError(response, 404, "NOT_FOUND", "The game is not available.");
      return;
    }

    let staged;
    try {
      staged = await stageGamePackage(request.body, gameAssetStorage);
    } catch (error) {
      if (error instanceof GamePackageError) {
        sendError(response, 400, "INVALID_GAME_PACKAGE", error.message);
        return;
      }
      throw error;
    }
    const admin = response.locals.adminUser as AdminIdentity;
    try {
      await pool.query(
        `INSERT INTO game_assets
          (id, game_id, object_key, entry_path, content_hash, compressed_size,
           expanded_size, file_count, asset_manifest, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
        [
          staged.id,
          gameId.data,
          `packages/${staged.id}`,
          staged.entryPath,
          staged.contentHash,
          staged.compressedSize,
          staged.expandedSize,
          staged.manifest.files.length,
          JSON.stringify(staged.manifest),
          admin.id,
        ],
      );
    } catch (error) {
      await discardStagedGamePackage(gameAssetStorage, staged.id);
      throw error;
    }
    await audit(admin, "game.asset_staged", "game", gameId.data, {
      assetId: staged.id,
      contentHash: staged.contentHash,
      expandedSize: staged.expandedSize,
      fileCount: staged.manifest.files.length,
    });
    response.status(201).json({
      assetId: staged.id,
      entryPath: staged.entryPath,
    });
  },
);

adminRouter.post("/games", async (request, response) => {
  const parsed = GameInput.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "VALIDATION_FAILED", "Check the game details and try again.");
    return;
  }
  const game = parsed.data;
  const admin = response.locals.adminUser as AdminIdentity;
  const result = await pool.query<{ id: string }>(
    `INSERT INTO games
      (slug, title, short_description, description, instructions, tags, category_id, entry_path)
     VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)
     RETURNING id`,
    [
      game.slug, JSON.stringify(game.title), JSON.stringify(game.shortDescription),
      JSON.stringify(game.description), JSON.stringify(game.instructions),
      JSON.stringify(game.tags), game.categoryId, game.entryPath,
    ],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error("Game creation returned no id");
  await audit(admin, "game.created", "game", id, { slug: game.slug });
  response.status(201).json({ id, status: "draft" });
});

adminRouter.get("/games/:id/preview", async (request, response) => {
  const result = await pool.query(
    `SELECT g.id, g.slug, g.title, g.short_description AS "shortDescription",
            g.description, g.instructions, g.tags, g.entry_path AS "entryPath",
            g.status, c.name AS category
     FROM games g JOIN categories c ON c.id = g.category_id WHERE g.id = $1`,
    [request.params.id],
  );
  const game = result.rows[0];
  if (!game) {
    sendError(response, 404, "NOT_FOUND", "The draft is not available.");
    return;
  }
  const assetId = getGamePackageId(game.entryPath);
  if (!assetId) {
    response.json({ game });
    return;
  }
  if (!config.GAME_PREVIEW_TOKEN_SECRET) {
    sendError(response, 503, "GAME_PREVIEW_UNAVAILABLE", "Private game preview is not configured.");
    return;
  }
  const asset = await pool.query(
    "SELECT 1 FROM game_assets WHERE id = $1 AND game_id = $2",
    [assetId, game.id],
  );
  if (!asset.rowCount) {
    sendError(response, 404, "NOT_FOUND", "The draft asset is not available.");
    return;
  }
  response.json({
    game,
    previewToken: createGamePreviewToken(assetId, config.GAME_PREVIEW_TOKEN_SECRET),
  });
});

adminRouter.patch("/games/:id", async (request, response) => {
  const parsed = GameInput.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "VALIDATION_FAILED", "Check the game details and try again.");
    return;
  }
  const game = parsed.data;
  const admin = response.locals.adminUser as AdminIdentity;
  const result = await pool.query(
    `UPDATE games
     SET slug = $2, title = $3::jsonb, short_description = $4::jsonb,
         description = $5::jsonb, instructions = $6::jsonb, tags = $7::jsonb,
         category_id = $8, entry_path = $9, validated_at = NULL
     WHERE id = $1 AND status <> 'archived'
     RETURNING id`,
    [
      request.params.id, game.slug, JSON.stringify(game.title),
      JSON.stringify(game.shortDescription), JSON.stringify(game.description),
      JSON.stringify(game.instructions), JSON.stringify(game.tags),
      game.categoryId, game.entryPath,
    ],
  );
  if (!result.rowCount) {
    sendError(response, 404, "NOT_FOUND", "The game is not available.");
    return;
  }
  await audit(admin, "game.updated", "game", request.params.id, { slug: game.slug });
  response.json({ updated: true });
});

adminRouter.post("/games/:id/validate", async (request, response) => {
  const result = await pool.query<{
    id: string;
    slug: string;
    title: unknown;
    short_description: unknown;
    description: unknown;
    instructions: unknown;
    tags: unknown;
    category_id: string;
    entry_path: string;
  }>("SELECT * FROM games WHERE id = $1 AND status <> 'archived'", [request.params.id]);
  const game = result.rows[0];
  if (!game) {
    sendError(response, 404, "NOT_FOUND", "The game is not available.");
    return;
  }
  const parsed = GameInput.safeParse({
    slug: game.slug,
    title: game.title,
    shortDescription: game.short_description,
    description: game.description,
    instructions: game.instructions,
    tags: game.tags,
    categoryId: game.category_id,
    entryPath: game.entry_path,
  });
  const category = await pool.query("SELECT 1 FROM categories WHERE id = $1 AND is_active = true", [game.category_id]);
  const assetId = getGamePackageId(game.entry_path);
  const asset = assetId
    ? await pool.query(
      "SELECT 1 FROM game_assets WHERE id = $1 AND game_id = $2",
      [assetId, game.id],
    )
    : null;
  if (
    !parsed.success ||
    !category.rowCount ||
    !isValidGameEntryPath(game.entry_path) ||
    (assetId !== null && !asset?.rowCount)
  ) {
    sendError(response, 422, "GAME_NOT_READY", "This game needs valid metadata and a supported game build.");
    return;
  }
  await pool.query("UPDATE games SET validated_at = now() WHERE id = $1", [game.id]);
  await audit(response.locals.adminUser as AdminIdentity, "game.validated", "game", game.id, { slug: game.slug });
  response.json({ valid: true });
});

adminRouter.post("/games/:id/publish", async (request, response) => {
  const client = await pool.connect();
  const admin = response.locals.adminUser as AdminIdentity;
  let newlyPublishedAssetId: string | undefined;
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string;
      slug: string;
      title: unknown;
      short_description: unknown;
      description: unknown;
      instructions: unknown;
      tags: unknown;
      category_id: string;
      entry_path: string;
      validated_at: Date | null;
    }>("SELECT * FROM games WHERE id = $1 FOR UPDATE", [request.params.id]);
    const game = result.rows[0];
    if (!game || !game.validated_at || !isValidGameEntryPath(game.entry_path)) {
      await client.query("ROLLBACK");
      sendError(response, 409, "GAME_NOT_VALIDATED", "Validate this game before publishing.");
      return;
    }
    const assetId = getGamePackageId(game.entry_path);
    if (assetId) {
      const asset = await client.query(
        `SELECT 1 FROM game_assets
         WHERE id = $1 AND game_id = $2 AND status IN ('staged', 'published')
         FOR UPDATE`,
        [assetId, game.id],
      );
      if (!asset.rowCount) {
        await client.query("ROLLBACK");
        sendError(response, 409, "GAME_ASSET_NOT_STAGED", "Upload and validate this game's package before publishing.");
        return;
      }
      if (await publishGamePackage(gameAssetStorage, assetId)) {
        newlyPublishedAssetId = assetId;
      }
    }
    const max = await client.query<{ next_revision: number }>(
      "SELECT COALESCE(max(revision_number), 0) + 1 AS next_revision FROM game_revisions WHERE game_id = $1",
      [game.id],
    );
    const snapshot = {
      title: game.title,
      shortDescription: game.short_description,
      description: game.description,
      instructions: game.instructions,
      tags: game.tags,
      categoryId: game.category_id,
    };
    const contentHash = sha256(JSON.stringify({ snapshot, entryPath: game.entry_path }));
    const revision = await client.query<{ id: string }>(
      `INSERT INTO game_revisions
        (game_id, revision_number, metadata_snapshot, entry_path, content_hash, created_by, asset_id)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7) RETURNING id`,
      [game.id, max.rows[0]?.next_revision ?? 1, JSON.stringify(snapshot), game.entry_path, contentHash, admin.id, assetId],
    );
    const revisionId = revision.rows[0]?.id;
    if (!revisionId) throw new Error("Revision creation returned no id");
    await client.query(
      `UPDATE games SET active_revision_id = $2, status = 'published',
        published_at = COALESCE(published_at, now()) WHERE id = $1`,
      [game.id, revisionId],
    );
    if (assetId) {
      await client.query("UPDATE game_assets SET status = 'published' WHERE id = $1", [assetId]);
    }
    await client.query(
      `INSERT INTO admin_audit_events (admin_user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'game.published', 'game', $2, $3::jsonb)`,
      [admin.id, game.id, JSON.stringify({ slug: game.slug, revisionId })],
    );
    await client.query("COMMIT");
    response.json({ published: true, revisionId });
  } catch (error) {
    await client.query("ROLLBACK");
    if (newlyPublishedAssetId) {
      try {
        await unpublishGamePackage(gameAssetStorage, newlyPublishedAssetId);
      } catch {
        console.error(JSON.stringify({
          event: "game_asset_publish_cleanup_failure",
          assetId: newlyPublishedAssetId,
        }));
      }
    }
    throw error;
  } finally {
    client.release();
  }
});

adminRouter.post("/games/:id/unpublish", async (request, response) => {
  const result = await pool.query<{ id: string; slug: string }>(
    "UPDATE games SET status = 'unpublished' WHERE id = $1 AND status = 'published' RETURNING id, slug",
    [request.params.id],
  );
  const game = result.rows[0];
  if (!game) {
    sendError(response, 409, "NOT_PUBLISHED", "This game is not currently published.");
    return;
  }
  const assets = await pool.query<{ id: string }>(
    "SELECT id FROM game_assets WHERE game_id = $1 AND status = 'published'",
    [game.id],
  );
  await pool.query(
    "UPDATE game_assets SET status = 'staged' WHERE game_id = $1 AND status = 'published'",
    [game.id],
  );
  for (const asset of assets.rows) {
    await unpublishGamePackage(gameAssetStorage, asset.id);
  }
  await audit(response.locals.adminUser as AdminIdentity, "game.unpublished", "game", request.params.id, { slug: game.slug });
  response.json({ unpublished: true });
});

adminRouter.get("/games/:id/revisions", async (request, response) => {
  const result = await pool.query(
    `SELECT id, revision_number, entry_path, content_hash, created_at
     FROM game_revisions WHERE game_id = $1 ORDER BY revision_number DESC`,
    [request.params.id],
  );
  response.json({ revisions: result.rows });
});

adminRouter.post("/games/:id/rollback", async (request, response) => {
  const body = z.object({ revisionId: z.string().uuid() }).safeParse(request.body);
  if (!body.success) {
    sendError(response, 400, "VALIDATION_FAILED", "Choose a valid revision.");
    return;
  }
  const revision = await pool.query<{ id: string; asset_id: string | null }>(
    "SELECT id, asset_id FROM game_revisions WHERE game_id = $1 AND id = $2",
    [request.params.id, body.data.revisionId],
  );
  const targetRevision = revision.rows[0];
  if (!targetRevision) {
    sendError(response, 404, "REVISION_NOT_FOUND", "That revision does not belong to this game.");
    return;
  }
  if (targetRevision.asset_id) {
    const asset = await pool.query(
      "SELECT 1 FROM game_assets WHERE id = $1 AND game_id = $2",
      [targetRevision.asset_id, request.params.id],
    );
    if (!asset.rowCount) {
      sendError(response, 409, "REVISION_ASSET_MISSING", "This revision's game package is unavailable.");
      return;
    }
    await publishGamePackage(gameAssetStorage, targetRevision.asset_id);
    await pool.query("UPDATE game_assets SET status = 'published' WHERE id = $1", [targetRevision.asset_id]);
  }
  const result = await pool.query<{ slug: string }>(
    `UPDATE games SET active_revision_id = $2, status = 'published'
     WHERE id = $1 RETURNING slug`,
    [request.params.id, targetRevision.id],
  );
  const game = result.rows[0];
  if (!game) {
    sendError(response, 404, "REVISION_NOT_FOUND", "That revision does not belong to this game.");
    return;
  }
  await audit(response.locals.adminUser as AdminIdentity, "game.rolled_back", "game", request.params.id, { slug: game.slug });
  response.json({ rolledBack: true, revisionId: body.data.revisionId });
});

api.use("/admin", adminRouter);
app.use("/api/v1", api);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;
  const requestId = response.locals.requestId;
  const code = error instanceof Error ? error.name : "UnknownError";
  console.error(JSON.stringify({ event: "api_error", requestId, code }));
  if (typeof error === "object" && error !== null && "status" in error) {
    if (error.status === 413) {
      sendError(response, 413, "REQUEST_TOO_LARGE", "The request exceeds the allowed size.");
      return;
    }
    if (error.status === 400) {
      sendError(response, 400, "INVALID_REQUEST_BODY", "The request body is not valid.");
      return;
    }
  }
  sendError(response, 500, "INTERNAL_ERROR", "The request could not be completed.");
};
app.use(errorHandler);

await pool.query("SELECT 1");
let retentionTimer: ReturnType<typeof setInterval> | undefined;
if (config.NODE_ENV === "production") {
  await pool.query(
    "DELETE FROM daily_analytics_aggregates WHERE event_date < (now() AT TIME ZONE 'UTC')::date - 365",
  );
  retentionTimer = setInterval(() => {
    void pool.query(
      "DELETE FROM daily_analytics_aggregates WHERE event_date < (now() AT TIME ZONE 'UTC')::date - 365",
    ).then(() => {
      retentionHealthy = true;
    }).catch((error: unknown) => {
      retentionHealthy = false;
      console.error(JSON.stringify({
        event: "analytics_retention_failure",
        code: error instanceof Error ? error.name : "UnknownError",
      }));
    });
  }, 24 * 60 * 60 * 1000);
  retentionTimer.unref();
}
const server = app.listen(config.API_PORT, () => {
  console.log(`Playworks API listening on port ${config.API_PORT}`);
});

async function shutdown(): Promise<void> {
  if (retentionTimer) clearInterval(retentionTimer);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
