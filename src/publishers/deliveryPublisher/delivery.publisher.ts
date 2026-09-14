import { prisma } from "../../lib/prisma.js";
import { DeliveryStatus } from "../../../generated/prisma/client.js";
import { addDeliveryJob } from "../../queues/delivery.queue.js";
import { recoverStuckDeliveries } from "../../services/stuckDeliveryRecovery.service.js";

export const publishDeliveryEvents = async () => {
  const recovered = await recoverStuckDeliveries();
  if (recovered > 0) {
    console.log(`Recovered ${recovered} stuck delivery(ies)`);
  }

  const now = new Date();

  const deliveries = await prisma.delivery.findMany({
    where: {
      status: DeliveryStatus.PENDING,
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
  });

  if (!deliveries.length) {
    return;
  }

  for (const delivery of deliveries) {
    await addDeliveryJob({ deliveryId: delivery.id });
  }
};
