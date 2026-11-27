import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    let detail: ApiErrorBody | undefined;
    try {
      detail = await response.json() as ApiErrorBody;
    } catch {
      detail = undefined;
    }
    throw new ApiError(detail?.message ?? "Request failed", response.status, detail?.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function csrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = document.cookie.split("; ").find((cookie) => cookie.startsWith("sp_csrf="));
  if (!value) return undefined;
  try {
    return decodeURIComponent(value.slice("sp_csrf=".length));
  } catch {
    return undefined;
  }
}

export function adminMutationHeaders(): HeadersInit {
  const token = csrfToken();
  return token ? { "X-CSRF-Token": token } : {};
}

export function trackEvent(eventType: "game_view" | "game_launch" | "favorite", gameSlug: string): void {
  void apiRequest("/analytics", {
    method: "POST",
    body: JSON.stringify({ eventType, gameSlug }),
  }).catch((error: unknown) => {
    const code = error instanceof ApiError ? error.code ?? "API_ERROR" : "NETWORK_ERROR";
    console.warn("Privacy-safe aggregate event was not recorded:", code);
  });
}
