import type { Request, Response } from "express";
import {
  createEndpointSchema,
  endpointIdParamSchema,
  updateEndpointSchema,
} from "../validators/schemaValidators.js";
import {
  createEndpointService,
  deleteEndpointService,
  getAllEndpointsService,
  getEndpointByIdService,
  updateEndpointService,
} from "../services/endpoint.service.js";
import { AppError } from "../utils/errors.js";

const getCustomerId = (req: Request, res: Response): string | null => {
  if (!req.customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return req.customerId;
};

const handleError = (res: Response, error: unknown) => {
  console.error(error);
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return res.status(500).json({ message: "Internal server error" });
};

export const createEndpoint = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerId(req, res);
    if (!customerId) return;

    const parsed = createEndpointSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const { eventType, endpoints } = parsed.data;
    const created = await createEndpointService(customerId, eventType, endpoints);

    return res.status(201).json({
      message: "Endpoints created successfully",
      data: created,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEndpoints = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerId(req, res);
    if (!customerId) return;

    const endpoints = await getAllEndpointsService(customerId);
    return res.status(200).json({ data: endpoints });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEndpointById = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerId(req, res);
    if (!customerId) return;

    const params = endpointIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({
        message: "Validation failed",
        details: params.error.flatten(),
      });
    }

    const endpoint = await getEndpointByIdService(customerId, params.data.id);
    return res.status(200).json({ data: endpoint });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateEndpoint = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerId(req, res);
    if (!customerId) return;

    const params = endpointIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({
        message: "Validation failed",
        details: params.error.flatten(),
      });
    }

    const parsed = updateEndpointSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const updated = await updateEndpointService(
      customerId,
      params.data.id,
      parsed.data,
    );

    return res.status(200).json({
      message: "Endpoint updated successfully",
      data: updated,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteEndpoint = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerId(req, res);
    if (!customerId) return;

    const params = endpointIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({
        message: "Validation failed",
        details: params.error.flatten(),
      });
    }

    const deleted = await deleteEndpointService(customerId, params.data.id);
    return res.status(200).json({
      message: "Endpoint deleted successfully",
      data: deleted,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
