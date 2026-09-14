import { prisma } from "../../lib/prisma.js";
import {
    EventStatus,
    OutboxStatus,
    DeliveryStatus,
  } from "../../../generated/prisma/client.js";

export const processOutboxEvents = async () =>{
    try{
        await prisma.$transaction(async (tx) =>{
            const [deliveryEvent] = await tx.$queryRaw<{ id: string; eventId: string }[]>`
              SELECT id, "eventId"
                FROM "OutboxEvent"
                WHERE status = 'PENDING'
                ORDER BY "createdAt" ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            `
            if (!deliveryEvent) {
                console.log('no event found for delivery')
                return { success: true, processed: false };
            }
            const event = await tx.event.findUnique({
                where: {
                    id: deliveryEvent.eventId,
                },
            });
            if(!event){
                throw new Error("Event not found");
            }
            const webhookEndpoints = await tx.webhookEndpoint.findMany({
                where:{
                    customerId: event.customerId,
                    eventType: event.eventType,
                    isActive: true,
                },
                select:{
                    id: true,
                }
            });
            if(!webhookEndpoints || webhookEndpoints.length === 0){
                if (webhookEndpoints.length === 0) {
                    await tx.outboxEvent.update({
                        where: { id: deliveryEvent.id },
                        data: {
                            status: OutboxStatus.PUBLISHED,
                            publishedAt: new Date(),
                        },
                    });
                
                    await tx.event.update({
                        where: { id: event.id },
                        data: {
                            status: EventStatus.COMPLETED,
                        },
                    });
                
                    return;
                }
            }
            
            await tx.delivery.createMany({
                data: webhookEndpoints.map((ep) => ({
                    eventId: event.id,
                    endpointId: ep.id,
                    status: DeliveryStatus.PENDING,
                    })),
                skipDuplicates: true, // @@unique([eventId, endpointId])
            });
            await tx.outboxEvent.update({
                where:{id:deliveryEvent.id},
                data:{
                    status: OutboxStatus.PUBLISHED,
                    publishedAt: new Date(),
                }
            });
            await tx.event.update({
                where:{id:event.id},
                data:{
                    status: webhookEndpoints.length > 0
                    ? EventStatus.DELIVERING
                    : EventStatus.COMPLETED,
                }
            })
            return {
                processed: true,
                message: "Outbox event processed successfully",
            }
        })

    }catch(e){
        console.error("Error processing outbox event:", e);
        return {
            processed: false,
            message: "Error processing outbox event",
        }
    }
}