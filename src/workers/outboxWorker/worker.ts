import { config } from "../../config/config.js";
import { processOutboxEvents } from "./outbox.worker.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const startOutboxWorker = async () => {
  console.log("Outbox worker started");
  while (true) {
    try {
      await processOutboxEvents();
    } catch (error) {
      console.error("Outbox worker error:", error);
    }
    await sleep(config.outbox.pollMs);
  }
};