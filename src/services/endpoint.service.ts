import { prisma } from "../lib/prisma.js";
import type {
  CreateEndpointSchema,
  UpdateEndpointSchema,
} from "../validators/schemaValidators.js";
import { encryptSecret } from "../utils/helper.js";
import { AppError, isPrismaError } from "../utils/errors.js";

type EndpointItem = CreateEndpointSchema["endpoints"][number];

const endpointSelect = {
  id: true,
  url: true,
  eventType: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const createEndpointService = async (
  customerId: string,
  eventType: string,
  endpoints: EndpointItem[],
) => {
  try {
    const created = await prisma.$transaction(
      endpoints.map((endpoint) =>
        prisma.webhookEndpoint.create({
          data: {
            customerId,
            url: endpoint.url,
            eventType,
            encryptedSecret: encryptSecret(endpoint.secret),
          },
          select: endpointSelect,
        }),
      ),
    );
    return created;
  } catch (error) {
    if (isPrismaError(error) && error.code === "P2002") {
      throw new AppError("Endpoint with this URL and event type already exists", 409);
    }
    throw error;
  }
};

export const getAllEndpointsService = async (customerId: string) => {
  return prisma.webhookEndpoint.findMany({
    where: { customerId },
    select: endpointSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getEndpointByIdService = async (customerId: string, id: string) => {
  const result = await prisma.webhookEndpoint.findFirst({
    where: { id, customerId },
    select: endpointSelect,
  });
  if (!result) {
    throw new AppError("Endpoint not found", 404);
  }
  return result;
};

export const updateEndpointService = async (
  customerId: string,
  id: string,
  data: UpdateEndpointSchema,
) => {
  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, customerId },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError("Endpoint not found", 404);
  }

  try {
    return await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(data.eventType !== undefined && { eventType: data.eventType }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.secret !== undefined && {
          encryptedSecret: encryptSecret(data.secret),
        }),
      },
      select: endpointSelect,
    });
  } catch (error) {
    if (isPrismaError(error) && error.code === "P2002") {
      throw new AppError("Endpoint with this URL and event type already exists", 409);
    }
    throw error;
  }
};

export const deleteEndpointService = async (customerId: string, id: string) => {
  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, customerId },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError("Endpoint not found", 404);
  }

  return prisma.webhookEndpoint.update({
    where: { id },
    data: { isActive: false },
    select: endpointSelect,
  });
};
