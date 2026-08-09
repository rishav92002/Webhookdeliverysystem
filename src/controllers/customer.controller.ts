import type { Request, Response } from "express";
import { customerSchema } from "../validators/schemaValidators.js";
import { createCustomerService, getCustomerService, updateCustomerService, deleteCustomerService, regenerateApiKeyService } from "../services/customer.service.js";

export const createCustomerController = async (req:Request, res:Response) => {
    const customerDetail = customerSchema.safeParse(req.body);
    if(!customerDetail.success) {
        return res.status(400).json({
            error: customerDetail.error.message,
        });
    }

    const customer = await createCustomerService(customerDetail.data);
    return res.status(200).json(customer);   
}
export const regenerateApiKeyController = async (req:Request, res:Response) => {
    if(!req.customerId){
        return res.status(401).json({message:'Unauthorized'});
    }

    const customer = await regenerateApiKeyService(req.customerId);
    return res.status(200).json(customer);   
}


export const getCustomerController = async (req:Request, res:Response) => {
    if(!req.customerId){
        return res.status(401).json({message:'Unauthorized'});
    }
    const customer = await getCustomerService(req.customerId);
    return res.status(200).json(customer);
}
export const updateCustomerController = async (req:Request, res:Response) => {
    if(!req.customerId){
        return res.status(401).json({message:'Unauthorized'});
    }
    const {name} = req.body;

    if(!name){
        return res.status(400).json({message:'Name is required'});
    }
    const customer = await updateCustomerService(req.customerId, name);
    return res.status(200).json(customer);
}
export const deleteCustomerController = async (req:Request, res:Response) => {
    if(!req.customerId){
        return res.status(401).json({message:'Unauthorized'});
    }
    const customer = await deleteCustomerService(req.customerId);
    return res.status(200).json(customer);
}