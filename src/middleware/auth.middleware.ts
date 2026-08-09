import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { generateHash } from "../utils/helper.js";







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
    req.customerId = customer.id;
    next();
}