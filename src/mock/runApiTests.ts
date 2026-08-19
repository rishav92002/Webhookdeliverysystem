/**
 * Hits all implemented API endpoints using mockData.
 *
 * Prerequisites:
 *   1. Server running: npm run dev
 *   2. DB migrated and ENCRYPTION_KEY set in .env
 *
 * Usage:
 *   npx tsx src/mock/runApiTests.ts
 */

import { mockData } from "./mockData.js";

type Json = Record<string, unknown> | unknown[] | string | null;

const baseUrl = mockData.baseUrl;

async function request(
  method: string,
  path: string,
  options: {
    body?: unknown;
    apiKey?: string;
    expectStatus?: number | number[];
  } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.apiKey) {
    headers["x-api-key"] = options.apiKey;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let body: Json = null;
  const text = await res.text();
  try {
    body = text ? (JSON.parse(text) as Json) : null;
  } catch {
    body = text;
  }

  const expected = options.expectStatus;
  const ok =
    expected === undefined
      ? res.ok
      : Array.isArray(expected)
        ? expected.includes(res.status)
        : res.status === expected;

  const label = `${method} ${path} → ${res.status}`;
  if (ok) {
    console.log(`✓ ${label}`);
  } else {
    console.error(`✗ ${label}`);
    console.error("  response:", body);
    throw new Error(`Unexpected status for ${label}`);
  }

  return { status: res.status, body };
}

function asRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`Expected object response, got: ${JSON.stringify(value)}`);
}

async function main() {
  console.log(`\nRunning API tests against ${baseUrl}\n`);

  // --- Customer: create (public) ---
  const createCustomer = await request("POST", "/api/customer", {
    body: mockData.customer.create,
    expectStatus: 201,
  });
  const customer = asRecord(createCustomer.body);
  const apiKey = customer.apiKey as string;
  const customerId = customer.customerId as string;
  if (!apiKey) throw new Error("create customer did not return apiKey");
  console.log(`  customerId=${customerId}`);

  // --- Customer: get / update / regenerate key ---
  await request("GET", "/api/customer", { apiKey, expectStatus: 200 });

  await request("PATCH", "/api/customer", {
    apiKey,
    body: mockData.customer.update,
    expectStatus: 200,
  });

  const regen = await request("POST", "/api/customer/api-key", {
    apiKey,
    expectStatus: 200,
  });
  const newApiKey = asRecord(regen.body).apiKey as string;
  if (!newApiKey) throw new Error("regenerate did not return apiKey");
  // old key should fail
  await request("GET", "/api/customer", {
    apiKey,
    expectStatus: 401,
  });
  const activeApiKey = newApiKey;

  // --- Endpoints: create ---
  const createdOrderPaid = await request("POST", "/api/endpoint", {
    apiKey: activeApiKey,
    body: mockData.endpoints.createOrderPaid,
    expectStatus: 201,
  });
  const orderPaidData = asRecord(createdOrderPaid.body).data as unknown[];
  const firstEndpointId = asRecord(orderPaidData[0] as Json).id as string;

  await request("POST", "/api/endpoint", {
    apiKey: activeApiKey,
    body: mockData.endpoints.createUserSignup,
    expectStatus: 201,
  });

  // validation: duplicate URLs in one request
  await request("POST", "/api/endpoint", {
    apiKey: activeApiKey,
    body: mockData.endpoints.createDuplicateUrls,
    expectStatus: 400,
  });

  // --- Endpoints: list / get / update / soft-delete ---
  await request("GET", "/api/endpoint", {
    apiKey: activeApiKey,
    expectStatus: 200,
  });

  await request("GET", `/api/endpoint/${firstEndpointId}`, {
    apiKey: activeApiKey,
    expectStatus: 200,
  });

  await request("PATCH", `/api/endpoint/${firstEndpointId}`, {
    apiKey: activeApiKey,
    body: mockData.endpoints.update,
    expectStatus: 200,
  });

  await request("DELETE", `/api/endpoint/${firstEndpointId}`, {
    apiKey: activeApiKey,
    expectStatus: 200,
  });

  // --- Events (stub route still callable) ---
  await request("POST", "/api/event/create", {
    apiKey: activeApiKey,
    body: mockData.events.create,
    expectStatus: [200, 202],
  });

  // --- Customer: soft deactivate (keep last — key may still work depending on status rules) ---
  await request("DELETE", "/api/customer", {
    apiKey: activeApiKey,
    expectStatus: 200,
  });

  // After deactivation request, auth should reject (ACTIVE check)
  await request("GET", "/api/customer", {
    apiKey: activeApiKey,
    expectStatus: 401,
  });

  console.log("\nAll API tests finished successfully.\n");
}

main().catch((err) => {
  console.error("\nAPI tests failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
