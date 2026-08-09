import type { Request, Response } from "express";
import { customerSchema } from "../validators/schemaValidators.js";
import { createCustomerService } from "../services/customer.service.js";

export const createCustomerController = async (req:Request, res:Response) => {
    const customerDetail = customerSchema.safeParse(req.body);
    if(!customerDetail.success) {
        return res.status(400).json({
            error: customerDetail.error.message,
        });
    }

    const customer = await createCustomerService(customerDetail.data);
    return res.status(202).json({
        customerId: customer.customerId,
        name : customer.name,
        apiKey: customer.apiKey,
    });
}