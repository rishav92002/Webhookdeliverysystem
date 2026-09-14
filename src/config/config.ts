import "dotenv/config";
import { z } from "zod";

const DEV_DATABASE_URL =
  "postgresql://webhook_user:webhook_password@localhost:5432/webhook_db";
const DEV_REDIS_URL = "redis://localhost:6379";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  API_BASE_URL: z.string().optional(),
  DELIVERY_MAX_RETRIES: z.coerce.number().default(5),
  DELIVERY_BASE_DELAY_MS: z.coerce.number().default(1_000),
  DELIVERY_MAX_DELAY_MS: z.coerce.number().default(60_000),
  DELIVERY_TIMEOUT_MS: z.coerce.number().default(10_000),
  DELIVERY_STALE_PROCESSING_MS: z.coerce.number().optional(),
  DELIVERY_WORKER_CONCURRENCY: z.coerce.number().optional(),
  PUBLISHER_POLL_MS: z.coerce.number().optional(),
  OUTBOX_POLL_MS: z.coerce.number().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

const parsed = envSchema.parse(process.env);

const isDev = parsed.NODE_ENV === "development";
const isProd = parsed.NODE_ENV === "production";
const isTest = parsed.NODE_ENV === "test";

function requireEnv(
  value: string | undefined,
  name: string,
  devFallback?: string,
): string {
  if (value) return value;
  if ((isDev || isTest) && devFallback) return devFallback;
  throw new Error(`Missing required env var: ${name}`);
}

export const config = {
  env: parsed.NODE_ENV,
  isDev,
  isProd,
  isTest,
  port: parsed.PORT,
  databaseUrl: requireEnv(
    parsed.DATABASE_URL,
    "DATABASE_URL",
    DEV_DATABASE_URL,
  ),
  redisUrl: requireEnv(parsed.REDIS_URL, "REDIS_URL", DEV_REDIS_URL),
  encryptionKey: requireEnv(parsed.ENCRYPTION_KEY, "ENCRYPTION_KEY"),
  apiBaseUrl:
    parsed.API_BASE_URL ?? `http://localhost:${parsed.PORT.toString()}`,
  logLevel:
    parsed.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  delivery: {
    maxRetries: parsed.DELIVERY_MAX_RETRIES,
    baseDelayMs: parsed.DELIVERY_BASE_DELAY_MS,
    maxDelayMs: parsed.DELIVERY_MAX_DELAY_MS,
    requestTimeoutMs: parsed.DELIVERY_TIMEOUT_MS,
    staleProcessingMs:
      parsed.DELIVERY_STALE_PROCESSING_MS ??
      Math.max(parsed.DELIVERY_TIMEOUT_MS * 3, 60_000),
    workerConcurrency:
      parsed.DELIVERY_WORKER_CONCURRENCY ?? (isProd ? 20 : 5),
  },
  publisher: {
    pollMs: parsed.PUBLISHER_POLL_MS ?? (isProd ? 1_000 : 3_000),
  },
  outbox: {
    pollMs: parsed.OUTBOX_POLL_MS ?? 1_000,
  },
} as const;
