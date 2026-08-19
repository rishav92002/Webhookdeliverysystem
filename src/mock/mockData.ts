/**
 * Mock request payloads for manual / scripted API testing.
 * Used by `src/mock/runApiTests.ts`.
 */

export const mockData = {
  baseUrl: process.env.API_BASE_URL ?? "http://localhost:5000",

  customer: {
    create: {
      name: "Acme Corp",
    },
    update: {
      name: "Acme Corporation",
    },
  },

  endpoints: {
    createOrderPaid: {
      eventType: "order.paid",
      endpoints: [
        {
          url: "https://webhook.site/mock-acme-order-paid-1",
          secret: "whsec_order_paid_primary_001",
        },
        {
          url: "https://webhook.site/mock-acme-order-paid-2",
          secret: "whsec_order_paid_secondary_002",
        },
      ],
    },
    createUserSignup: {
      eventType: "user.signup",
      endpoints: [
        {
          url: "https://webhook.site/mock-acme-user-signup",
          secret: "whsec_user_signup_001",
        },
      ],
    },
    /** Intentionally invalid — duplicate URLs in one request */
    createDuplicateUrls: {
      eventType: "order.paid",
      endpoints: [
        {
          url: "https://webhook.site/mock-duplicate",
          secret: "whsec_dup_1",
        },
        {
          url: "https://webhook.site/mock-duplicate",
          secret: "whsec_dup_2",
        },
      ],
    },
    update: {
      eventType: "order.paid.v2",
      url: "https://webhook.site/mock-acme-order-paid-updated",
      isActive: true,
      secret: "whsec_order_paid_rotated_003",
    },
    softDelete: {
      isActive: false,
    },
  },

  events: {
    create: {
      eventType: "order.paid",
      idempotencyKey: "mock-idempotency-key-001",
      payload: {
        orderId: "ord_12345",
        amount: 4999,
        currency: "INR",
        customerEmail: "buyer@example.com",
      },
    },
  },
} as const;

export type MockData = typeof mockData;
