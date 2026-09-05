import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

interface DeliveryJobData {
  deliveryId: string;
}

export const deliveryQueue = new Queue<DeliveryJobData>("delivery-queue", {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: true,
  },
});

export const addDeliveryJob = async (job: DeliveryJobData) => {
  await deliveryQueue.add(
    "delivery-queue",
    { deliveryId: job.deliveryId },
    { jobId: job.deliveryId },
  );
};

export const scheduleDeliveryRetry = async (
  deliveryId: string,
  retryCount: number,
  delayMs: number,
) => {
  await deliveryQueue.add(
    "delivery-queue",
    { deliveryId },
    {
      jobId: `${deliveryId}-retry-${retryCount}`,
      delay: delayMs,
    },
  );
};
