import { z } from "zod";

const optionalEmail = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().email().optional(),
);
const optionalValue = z.preprocess((value) => value === "" ? undefined : value, z.string().optional());

const Environment = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000").transform((value) => new URL(value).origin),
  DATABASE_URL: z.string().min(1),
  GAME_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  GAME_ASSET_DIR: z.string().min(1).default("../games/data"),
  GAME_STORAGE_S3_ENDPOINT: optionalValue,
  GAME_STORAGE_S3_REGION: z.string().min(1).default("auto"),
  GAME_STORAGE_S3_BUCKET: optionalValue,
  GAME_STORAGE_S3_ACCESS_KEY_ID: optionalValue,
  GAME_STORAGE_S3_SECRET_ACCESS_KEY: optionalValue,
  GAME_PREVIEW_TOKEN_SECRET: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().min(32).optional(),
  ),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(12),
  RESEND_API_KEY: z.string().optional(),
  CONTACT_FROM: optionalEmail,
  CONTACT_TO: optionalEmail,
}).superRefine((environment, context) => {
  if (environment.NODE_ENV === "production" && environment.GAME_STORAGE_DRIVER !== "s3") {
    context.addIssue({
      code: "custom",
      path: ["GAME_STORAGE_DRIVER"],
      message: "Production game assets require S3-compatible object storage.",
    });
  }
  if (environment.NODE_ENV === "production" && !environment.GAME_PREVIEW_TOKEN_SECRET) {
    context.addIssue({
      code: "custom",
      path: ["GAME_PREVIEW_TOKEN_SECRET"],
      message: "Production private game previews require a signing secret.",
    });
  }
  if (environment.GAME_STORAGE_DRIVER === "s3") {
    for (const key of [
      "GAME_STORAGE_S3_ENDPOINT",
      "GAME_STORAGE_S3_BUCKET",
      "GAME_STORAGE_S3_ACCESS_KEY_ID",
      "GAME_STORAGE_S3_SECRET_ACCESS_KEY",
    ] as const) {
      if (!environment[key]) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "This value is required when GAME_STORAGE_DRIVER=s3.",
        });
      }
    }
  }
});

export function readEnvironment() {
  return Environment.parse(process.env);
}
