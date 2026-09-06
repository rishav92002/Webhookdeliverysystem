import { prisma } from "../lib/prisma.js";
import { DeliveryStatus } from "../../generated/prisma/client.js";
import axios, { AxiosError } from "axios";
import { scheduleDeliveryRetry } from "../queues/delivery.queue.js";
import { config } from "../config/config.js";

export const MAX_RETRIES = config.delivery.maxRetries;

type FailureKind = "retryable" | "non_retryable";

function parseRetryAfter(header?: string): number | undefined {
  if (!header) return undefined;

  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;

  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());

  return undefined;
}

export function classifyError(error: unknown): {
  kind: FailureKind;
  statusCode?: number;
  message: string;
  retryAfterMs?: number;
} {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError;

    if (ax.code === "ECONNABORTED" || ax.code === "ETIMEDOUT") {
      return { kind: "retryable", message: "timeout" };
    }

    if (!ax.response) {
      return { kind: "retryable", message: ax.message };
    }

    const status = ax.response.status;
    const retryAfterMs = parseRetryAfter(
      ax.response.headers["retry-after"] as string | undefined,
    );

    if (status >= 500) {
      return {
        kind: "retryable",
        statusCode: status,
        message: `HTTP ${status}`,
        ...(retryAfterMs != null ? { retryAfterMs } : {}),
      };
    }

    if (status >= 400 && status < 500) {
      return {
        kind: "non_retryable",
        statusCode: status,
        message: `HTTP ${status}`,
      };
    }
  }

  return {
    kind: "retryable",
    message: error instanceof Error ? error.message : "unknown",
  };
}

export function computeDelayMs(
  retryCount: number,
  retryAfterMs?: number,
): number {
  const { baseDelayMs, maxDelayMs } = config.delivery;
  const exponential = Math.min(
    baseDelayMs * 2 ** (retryCount - 1),
    maxDelayMs,
  );
  const jitter = Math.floor(Math.random() * exponential * 0.25);
  let delay = Math.min(exponential + jitter, maxDelayMs);

  if (retryAfterMs != null) {
    delay = Math.min(Math.max(delay, retryAfterMs), maxDelayMs);
  }

  return delay;
}

export const handleRetry = async (
  deliveryId: string,
  delayMs: number,
  retryCount: number,
  lastError: string,
) => {
  const nextRetryAt = new Date(Date.now() + delayMs);

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      status: DeliveryStatus.PENDING,
      retryCount,
      nextRetryAt,
      processingAt: null,
      lastError,
    },
  });

  await scheduleDeliveryRetry(deliveryId, retryCount, delayMs);
};
