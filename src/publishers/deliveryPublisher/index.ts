import { publishDeliveryEvents } from "./delivery.publisher.js";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const startDeliveryPublisher = async () => {
    while (true) {
        await publishDeliveryEvents();
        await sleep(3000);
    }
};

startDeliveryPublisher();