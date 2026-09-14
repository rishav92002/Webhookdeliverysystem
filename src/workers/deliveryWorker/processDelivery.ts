import { prisma } from "../../lib/prisma.js";
import { DeliveryStatus } from "../../../generated/prisma/client.js";
import { completeEvent } from "../../services/eventCompletion.service.js";
import axios from "axios";
import {
  generateWebhookSignature,
  decryptSecret,
} from "../../utils/helper.js";
import { config } from "../../config/config.js";
import {
  classifyError,
  computeDelayMs,
  handleRetry,
  MAX_RETRIES,
} from "../../utils/retry.js";

export const processDelivery = async (deliveryId: string) => {
  const claim = await prisma.delivery.updateMany({
    where: {
      id: deliveryId,
      status: DeliveryStatus.PENDING,
    },
    data: {
      status: DeliveryStatus.PROCESSING,
      processingAt: new Date(),
    },
  });

  if (claim.count === 0) {
    return;
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      event: true,
      endpoint: true,
    },
  });

  if (!delivery) {
    throw new Error(`Delivery ${deliveryId} not found`);
  }

  try {
    const secret = decryptSecret(delivery.endpoint.encryptedSecret);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateWebhookSignature(
      secret,
      timestamp,
      JSON.stringify(delivery.event.payload),
    );

    await axios.post(delivery.endpoint.url, delivery.event.payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Id": delivery.id,
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp,
        "Idempotency-Key": delivery.event.idempotencyKey,
      },
      timeout: config.delivery.requestTimeoutMs,
    });

    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.SUCCESS,
        completedAt: new Date(),
        lastError: null,
        nextRetryAt: null,
        processingAt: null,
      },
    });

    await completeEvent(delivery.event.id);

  } catch (error) {
    const failure = classifyError(error);

    if (failure.kind === "non_retryable") {
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.FAILED_PERMANENTLY,
          lastError: failure.message,
          processingAt: null,
          nextRetryAt: null,
        },
      });
      await completeEvent(delivery.event.id);
      return;
    }

    const nextRetryCount = delivery.retryCount + 1;

    if (nextRetryCount > MAX_RETRIES) {
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.FAILED_PERMANENTLY,
          retryCount: nextRetryCount,
          lastError: failure.message,
          processingAt: null,
          nextRetryAt: null,
        },
      });
      await completeEvent(delivery.event.id);
      return;
    }

    const delayMs = computeDelayMs(nextRetryCount, failure.retryAfterMs);
    await handleRetry(deliveryId, delayMs, nextRetryCount, failure.message);
  }
};
