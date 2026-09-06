import { Worker } from "bullmq";
import { config } from "../../config/config.js";
import { redis } from "../../config/redis.js";
import { processDelivery } from "./processDelivery.js";

export const startDeliveryWorker = () => {
    const worker = new Worker(
      "delivery-queue",
      async (job) => {
        await processDelivery(job.data.deliveryId);
      },
      {
        connection: redis,
        concurrency: config.delivery.workerConcurrency,
      }
    );
  
    worker.on("completed", (job) => {
      console.log(`Delivery job ${job.id} completed`);
    });
  
    worker.on("failed", (job, error) => {
      console.error(
        `Delivery job ${job?.id} failed:`,
        error
      );
    });
  
    console.log("Delivery worker started");
  };




