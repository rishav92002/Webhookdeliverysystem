import { prisma } from "../lib/prisma.js";
import { EventStatus, DeliveryStatus, OutboxStatus } from "../../generated/prisma/client.js";

export const completeEvent = async (eventId: string) => {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "Event"
        WHERE id = ${eventId}
        FOR UPDATE
      `;
  
      const unfinishedCount = await tx.delivery.count({
        where: {
          eventId,
          status: {
            in: [
              DeliveryStatus.PENDING,
              DeliveryStatus.PROCESSING,
            ],
          },
        },
      });
  
      if (unfinishedCount > 0) {
        return false;
      }
  
      const result = await tx.event.updateMany({
        where: {
          id: eventId,
          status: EventStatus.DELIVERING,
        },
        data: {
          status: EventStatus.COMPLETED,
        },
      });
  
      return result.count === 1;
    });
  };