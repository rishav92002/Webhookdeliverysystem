
import type { Request, Response } from "express";

import {createEventService} from "../services/event.service.js"

export const createEventController = async (req:Request, res:Response) =>  {

    const createRes = createEventService();
    return res.status(202).json({
        eventId: '',
        status: createRes,
    });
}
