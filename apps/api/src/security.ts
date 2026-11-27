import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(valueParts.join("="));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function setAuthCookies(
  response: Response,
  sessionToken: string,
  csrfToken: string,
  maxAgeSeconds: number,
): void {
  const secure = process.env.NODE_ENV === "production";
  const common = `Path=/; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
  response.append(
    "Set-Cookie",
    `sp_session=${encodeURIComponent(sessionToken)}; HttpOnly; ${common}`,
  );
  response.append("Set-Cookie", `sp_csrf=${encodeURIComponent(csrfToken)}; ${common}`);
}

export function clearAuthCookies(response: Response): void {
  const secure = process.env.NODE_ENV === "production";
  const common = `Path=/; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
  response.append("Set-Cookie", `sp_session=; HttpOnly; ${common}`);
  response.append("Set-Cookie", `sp_csrf=; ${common}`);
}

export function isValidGameEntryPath(value: string): boolean {
  return value === "/games/meteor-dash/index.html" ||
    value === "/games/orbit-memory/index.html" ||
    getGamePackageId(value) !== null;
}

export function getGamePackageId(value: string): string | null {
  const match = /^\/packages\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})\/index\.html$/i.exec(value);
  return match?.[1] ?? null;
}

export function createGamePreviewToken(
  assetId: string,
  secret: string,
  now = Date.now(),
): string {
  if (secret.length < 32) throw new Error("Game preview signing secret must be at least 32 characters");
  const expiresAt = Math.floor(now / 1000) + 300;
  const signature = createHmac("sha256", secret)
    .update(`${assetId}.${expiresAt}`)
    .digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function isValidGamePreviewToken(
  assetId: string,
  token: string,
  secret: string,
  now = Date.now(),
): boolean {
  if (secret.length < 32) return false;
  const match = /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  const currentTime = Math.floor(now / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= currentTime || expiresAt > currentTime + 300) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${assetId}.${expiresAt}`)
    .digest();
  const supplied = Buffer.from(match[2]!, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
