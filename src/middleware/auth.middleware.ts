import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { generateHash } from "../utils/helper.js";
import { CustomerStatus } from "../../generated/prisma/client.js";







export const authenticateCustomer = async (req:Request,res:Response,next:NextFunction) =>{
    const apiKey = req.headers['x-api-key'] as string;
    if(!apiKey){
        return res.status(401).json({message:'Unauthorized'});
    }
    const hashedKey = generateHash(apiKey);
    const customer = await prisma.customer.findUnique({
        where:{apiKeyHash:hashedKey},
    });
    if(!customer){
        return res.status(401).json({message:'Unauthorized'});
    }
    if(customer.status !== CustomerStatus.ACTIVE){
        return res.status(401).json({message:'Customer is not active'});
    }
  req.customerId = customer.id;
  next();
};