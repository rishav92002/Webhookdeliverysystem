import type { Request, Response } from "express";
import {prisma} from "../lib/prisma.js";
import {generateApikey} from "../utils/helper.js"
interface Customer {
    name: string;
}

export const createCustomerService = async (customerDetail: Customer) => {
    const {apiKey,hashedKey} = generateApikey()
    const customer = await prisma.customer.create({
        data: {
            name: customerDetail.name,
            apiKeyHash: hashedKey
        },
    });
    return {customerId:customer.id,name:customer.name,apiKey};
}   

