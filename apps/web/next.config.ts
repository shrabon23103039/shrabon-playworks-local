import type { NextConfig } from "next";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const localEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}

const apiOrigin = process.env.API_INTERNAL_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
