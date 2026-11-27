import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { createHmac, timingSafeEqual } from "node:crypto";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(moduleDirectory, "../../.env") });
const port = Number(process.env.GAMES_PORT ?? 4002);
const webOrigin = new URL(process.env.WEB_ORIGIN ?? "http://localhost:3000").origin;
const gameAssetDirectory = resolve(process.cwd(), process.env.GAME_ASSET_DIR ?? "../games/data");
const stagedPackagesDirectory = resolve(gameAssetDirectory, "staging");
const publishedPackagesDirectory = resolve(gameAssetDirectory, "public", "packages");
const previewTokenSecret = process.env.GAME_PREVIEW_TOKEN_SECRET;
const sourcePublicDirectory = resolve(moduleDirectory, "public");
const publicDirectory = existsSync(sourcePublicDirectory)
  ? sourcePublicDirectory
  : resolve(moduleDirectory, "../public");
const require = createRequire(import.meta.url);
const fontPackageDirectory = dirname(require.resolve("@fontsource/noto-sans-bengali/package.json"));
const fontDirectory = resolve(fontPackageDirectory, "files");
const app = express();

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
      connectSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: [webOrigin],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false,
  referrerPolicy: { policy: "no-referrer" },
}));
app.get("/healthz", (_request, response) => response.json({ status: "ok" }));
app.use("/preview/:assetId/:token", (request, response, next) => {
  const { assetId, token } = request.params;
  if (
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(assetId ?? "") ||
    !previewTokenSecret ||
    !isValidPreviewToken(assetId ?? "", token ?? "", previewTokenSecret)
  ) {
    response.status(404).type("text/plain").send("Not found");
    return;
  }

  let segments: string[];
  try {
    segments = request.path.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    response.status(400).type("text/plain").send("Invalid path");
    return;
  }
  if (
    !segments.length ||
    segments.some((segment) =>
      !segment ||
      segment === "." ||
      segment === ".." ||
      segment.includes("/") ||
      segment.includes("\\") ||
      segment.includes("\0") ||
      segment.startsWith("."),
    ) ||
    segments.at(-1) === "playworks.json"
  ) {
    response.status(404).type("text/plain").send("Not found");
    return;
  }

  const packageRoot = resolve(stagedPackagesDirectory, assetId ?? "");
  const filePath = resolve(packageRoot, ...segments);
  if (!filePath.startsWith(`${packageRoot}${sep}`)) {
    response.status(404).type("text/plain").send("Not found");
    return;
  }
  response.setHeader("Cache-Control", "private, no-store");
  response.sendFile(filePath, { dotfiles: "deny", cacheControl: false }, (error) => {
    if (error && !response.headersSent) {
      if ("status" in error && error.status === 404) {
        response.status(404).type("text/plain").send("Not found");
      } else {
        next(error);
      }
    }
  });
});
app.use("/packages", express.static(publishedPackagesDirectory, {
  dotfiles: "deny",
  extensions: false,
  index: false,
  fallthrough: true,
  maxAge: "1h",
  immutable: false,
}));
app.use("/fonts", express.static(fontDirectory, {
  dotfiles: "deny",
  fallthrough: false,
  maxAge: "1y",
  immutable: true,
}));
app.use(express.static(publicDirectory, {
  dotfiles: "deny",
  extensions: false,
  index: false,
  fallthrough: false,
  immutable: false,
  maxAge: "1h",
  setHeaders(response) {
    response.setHeader("Cache-Control", "public, max-age=3600");
    response.setHeader("X-Content-Type-Options", "nosniff");
  },
}));
app.use((_request, response) => response.status(404).type("text/plain").send("Not found"));

app.listen(port, () => {
  console.log(`Isolated game origin listening on port ${port}; frames allowed only from ${webOrigin}`);
});

function isValidPreviewToken(assetId: string, token: string, secret: string): boolean {
  const match = /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + 300) return false;
  const expected = createHmac("sha256", secret).update(`${assetId}.${expiresAt}`).digest();
  const supplied = Buffer.from(match[2]!, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
