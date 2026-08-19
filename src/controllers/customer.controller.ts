import type { Request, Response } from "express";
import {
  customerSchema,
  updateCustomerSchema,
} from "../validators/schemaValidators.js";
import {
  createCustomerService,
  getCustomerService,
  updateCustomerService,
  deleteCustomerService,
  regenerateApiKeyService,
} from "../services/customer.service.js";

export const createCustomerController = async (req: Request, res: Response) => {
  const customerDetail = customerSchema.safeParse(req.body);
  if (!customerDetail.success) {
    return res.status(400).json({
      message: "Validation failed",
      details: customerDetail.error.flatten(),
    });
  }

  const customer = await createCustomerService(customerDetail.data);
  return res.status(201).json(customer);
};

export const regenerateApiKeyController = async (
  req: Request,
  res: Response,
) => {
  if (!req.customerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const customer = await regenerateApiKeyService(req.customerId);
  return res.status(200).json(customer);
};

export const getCustomerController = async (req: Request, res: Response) => {
  if (!req.customerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const customer = await getCustomerService(req.customerId);
  return res.status(200).json(customer);
};

export const updateCustomerController = async (req: Request, res: Response) => {
  if (!req.customerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      details: parsed.error.flatten(),
    });
  }

  const customer = await updateCustomerService(
    req.customerId,
    parsed.data.name,
  );
  return res.status(200).json(customer);
};

export const deleteCustomerController = async (req: Request, res: Response) => {
  if (!req.customerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const customer = await deleteCustomerService(req.customerId);
  return res.status(200).json(customer);
};