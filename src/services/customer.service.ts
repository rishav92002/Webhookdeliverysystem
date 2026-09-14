import { prisma } from "../lib/prisma.js";
import { CustomerStatus } from "../../generated/prisma/client.js";
import { generateApikey } from "../utils/helper.js";
interface Customer {
  name: string;
}

export const createCustomerService = async (customerDetail: Customer) => {
  const { apiKey, hashedKey } = generateApikey();
  const customer = await prisma.customer.create({
    data: {
      name: customerDetail.name,
      apiKeyHash: hashedKey,
    },
  });
  return {
    customerId: customer.id,
    name: customer.name,
    apiKey,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};

export const regenerateApiKeyService = async (id: string) => {
  const { apiKey, hashedKey } = generateApikey();
  const customer = await prisma.customer.update({
    where: { id: id },
    data: { apiKeyHash: hashedKey },
  });
  return {
    customerId: customer.id,
    name: customer.name,
    apiKey,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};
export const getCustomerService = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: id },
  });
  if (!customer) {
    throw new Error("Customer not found");
  }
  return {
    customerId: customer.id,
    name: customer.name,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};

export const updateCustomerService = async (id: string, name: string) => {
  const customer = await prisma.customer.update({
    where: { id: id },
    data: { name: name },
  });
  return {
    customerId: customer.id,
    name: customer.name,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};
export const deleteCustomerService = async (id: string) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new Error("Customer not found");
  }

  if (customer.status === CustomerStatus.INACTIVE) {
    throw new Error("Customer already inactive");
  }

  if (customer.status === CustomerStatus.DEACTIVATION_REQUESTED) {
    return { customerId: id, status: customer.status };
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: { status: CustomerStatus.DEACTIVATION_REQUESTED },
  });

  return { customerId: updated.id, status: updated.status };
};
