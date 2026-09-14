import { config } from "../../config/config.js";
import { publishDeliveryEvents } from "./delivery.publisher.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const startDeliveryPublisher = async () => {
  while (true) {
    await publishDeliveryEvents();
    await sleep(config.publisher.pollMs);
  }
};

startDeliveryPublisher();