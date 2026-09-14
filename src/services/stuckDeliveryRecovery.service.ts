import { prisma } from "../lib/prisma.js";
import { DeliveryStatus } from "../../generated/prisma/client.js";
import { addDeliveryJob } from "../queues/delivery.queue.js";
import { config } from "../config/config.js";

const BATCH_SIZE = 50;

export async function recoverStuckDeliveries(): Promise<number> {
  const cutoff = new Date(Date.now() - config.delivery.staleProcessingMs);

  const stuck = await prisma.delivery.findMany({
    where: {
      status: DeliveryStatus.PROCESSING,
      OR: [{ processingAt: { lt: cutoff } }, { processingAt: null }],
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  let recovered = 0;

  for (const { id } of stuck) {
    const updated = await prisma.delivery.updateMany({
      where: {
        id,
        status: DeliveryStatus.PROCESSING,
        OR: [{ processingAt: { lt: cutoff } }, { processingAt: null }],
      },
      data: {
        status: DeliveryStatus.PENDING,
        processingAt: null,
      },
    });

    if (updated.count === 0) {
      continue;
    }

    await addDeliveryJob({ deliveryId: id });
    recovered++;
  }

  return recovered;
}
