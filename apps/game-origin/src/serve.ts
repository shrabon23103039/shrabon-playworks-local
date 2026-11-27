const PACKAGE_ID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const MIME_TYPES: Readonly<Record<string, string>> = {
  avif: "image/avif",
  css: "text/css; charset=utf-8",
  gif: "image/gif",
  html: "text/html; charset=utf-8",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  ogg: "audio/ogg",
  png: "image/png",
  ttf: "font/ttf",
  wav: "audio/wav",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
};

export type R2ObjectLike = {
  body: ReadableStream<Uint8Array>;
};

export type R2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>;
};

export type GameOriginEnvironment = {
  GAME_ASSETS?: R2BucketLike;
  MAIN_SITE_ORIGIN?: string;
  PREVIEW_TOKEN_SECRET?: string;
};

type OriginMode = "published" | "preview";

function parseSiteOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin !== value ||
      url.username ||
      url.password
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function parseObjectPath(path: string): string | null {
  try {
    const segments = path.split("/").map((segment) => decodeURIComponent(segment));
    if (
      !segments.length ||
      segments.some((segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.startsWith(".") ||
        segment.includes("/") ||
        segment.includes("\\") ||
        segment.includes("\0") ||
        /[\u0000-\u001f\u007f]/.test(segment),
      ) ||
      segments.at(-1) === "playworks.json"
    ) return null;
    return segments.join("/");
  } catch {
    return null;
  }
}

function contentType(path: string): string | null {
  const extension = path.split(".").at(-1)?.toLowerCase();
  return extension ? MIME_TYPES[extension] ?? null : null;
}

function responseHeaders(siteOrigin: string, cacheControl: string, mimeType?: string): Headers {
  const headers = new Headers({
    "Cache-Control": cacheControl,
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "media-src 'self'",
      "connect-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      `frame-ancestors ${siteOrigin}`,
    ].join("; "),
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (mimeType) headers.set("Content-Type", mimeType);
  return headers;
}

function notFound(siteOrigin: string): Response {
  return new Response("Not found", {
    status: 404,
    headers: responseHeaders(siteOrigin, "private, no-store", "text/plain; charset=utf-8"),
  });
}

function unavailable(siteOrigin: string): Response {
  return new Response("Game assets are temporarily unavailable", {
    status: 503,
    headers: responseHeaders(siteOrigin, "private, no-store", "text/plain; charset=utf-8"),
  });
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function isValidPreviewToken(
  assetId: string,
  token: string,
  secret: string,
): Promise<boolean> {
  const match = /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + 300) return false;
  const signature = decodeBase64Url(match[2]!);
  if (!signature || signature.length !== 32) return false;
  const signatureBuffer = new ArrayBuffer(signature.length);
  new Uint8Array(signatureBuffer).set(signature);
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      new TextEncoder().encode(`${assetId}.${expiresAt}`),
    );
  } catch {
    return false;
  }
}

export async function serveGameAsset(
  request: Request,
  environment: GameOriginEnvironment,
  mode: OriginMode,
): Promise<Response> {
  const siteOrigin = parseSiteOrigin(environment.MAIN_SITE_ORIGIN);
  if (!siteOrigin || !environment.GAME_ASSETS) {
    return new Response("Game origin is not configured", {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        ...Object.fromEntries(responseHeaders(siteOrigin, "private, no-store")),
        Allow: "GET, HEAD",
      },
    });
  }

  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  let assetId: string | undefined;
  let relativePath: string | null = null;
  let keyPrefix = "";
  let cacheControl = "";

  if (mode === "published" && segments[0] === "packages") {
    assetId = segments[1];
    relativePath = parseObjectPath(segments.slice(2).join("/"));
    keyPrefix = "packages";
    cacheControl = "public, max-age=31536000, immutable";
  } else if (mode === "preview" && segments[0] === "preview") {
    assetId = segments[1];
    const token = segments[2];
    relativePath = parseObjectPath(segments.slice(3).join("/"));
    if (
      !assetId ||
      !PACKAGE_ID.test(assetId) ||
      !token ||
      !environment.PREVIEW_TOKEN_SECRET ||
      environment.PREVIEW_TOKEN_SECRET.length < 32 ||
      !(await isValidPreviewToken(assetId, token, environment.PREVIEW_TOKEN_SECRET))
    ) return notFound(siteOrigin);
    keyPrefix = "staging";
    cacheControl = "private, no-store";
  } else {
    return notFound(siteOrigin);
  }

  if (!assetId || !PACKAGE_ID.test(assetId) || !relativePath) return notFound(siteOrigin);
  const mimeType = contentType(relativePath);
  if (!mimeType) return notFound(siteOrigin);

  try {
    const object = await environment.GAME_ASSETS.get(`${keyPrefix}/${assetId}/${relativePath}`);
    if (!object) return notFound(siteOrigin);
    return new Response(request.method === "HEAD" ? null : object.body, {
      status: 200,
      headers: responseHeaders(siteOrigin, cacheControl, mimeType),
    });
  } catch {
    return unavailable(siteOrigin);
  }
}
