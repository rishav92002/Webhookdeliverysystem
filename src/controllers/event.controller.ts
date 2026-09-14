
import type { Request, Response } from "express";

import {createEventService} from "../services/event.service.js"

export const createEventController = async (req:Request, res:Response) =>  {
    try{
        const customerId = req.customerId;
        if(!customerId){
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }
        const idempotencyKey = req.headers['idempotency-key'];
        if (typeof idempotencyKey !== "string" || !idempotencyKey) {
            return res.status(400).json({
                message: "Idempotency key is missing"
            })
        }
        const {eventType, payload} = req.body;
        if(!eventType || !payload){
            return res.status(400).json({
                message: 'Invalid request',
            });
        }
        const event = await createEventService({customerId, eventType, payload, idempotencyKey});
        return res.status(202).json({
            eventId: event.id,
            status: event.status,
        });

    }catch(error){
        return res.status(500).json({
            message: 'Internal server error',
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }

    
}
