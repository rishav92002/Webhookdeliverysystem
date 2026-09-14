
import { prisma } from "../lib/prisma.js";
import { AppError, isPrismaError } from "../utils/errors.js";
import {
  CustomerStatus,
  EventStatus,
  type Prisma,
} from "../../generated/prisma/client.js";

export const createEventService = async ({
  customerId,
  eventType,
  payload,
  idempotencyKey,
}: {
  customerId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  idempotencyKey: string;
}) => {
    try{
      //Check the status of customer
      const customer = await prisma.customer.findUnique({
        where:{
            id:customerId
        }
      })
      if (!customer) {
        throw new AppError("Customer not found", 404);
      }
      if (customer.status !== CustomerStatus.ACTIVE) {
        throw new AppError("Customer is not active", 403);
      }
      // With idempotency key check if event is duplicate
      const eventCheck = await prisma.event.findUnique({
        where: {
          customerId_idempotencyKey: {
            customerId,
            idempotencyKey,
          },
        },
      });
      
      if(eventCheck) return eventCheck;

      // Create event and outbox event
      const eventCreated = await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
          data: {
            customerId,
            eventType,
            payload,
            idempotencyKey,
            status: EventStatus.RECEIVED,
          },
        });
        await tx.outboxEvent.create({
          data: {
            eventId: event.id,
          },
        });
        return event;
      });
      
      return eventCreated; 
        
    }catch(error){
        if (isPrismaError(error) && error.code === "P2002") {
            const existingEvent = await prisma.event.findUnique({
                where: {
                  customerId_idempotencyKey: {
                    customerId,
                    idempotencyKey,
                  },
                },
              });
              if (existingEvent) {
                return existingEvent;
              }
        }
        throw error;
    }
}