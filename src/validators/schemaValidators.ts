import z from "zod";

export const webhookSchema = z.object({
  url: z.string(),
  method: z.enum(["POST"]),
  headers: z.record(z.string(), z.string()),
  body: z.any(),
});

export const eventSchema = z.object({
  eventType: z.string().min(1),
  payload: z.record(z.string(), z.any()),
  idempotencyKey: z.string().min(1).optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1).max(30),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(30),
});

export const endpointIdParamSchema = z.object({
  id: z.uuid(),
});

export const createEndpointSchema = z
  .object({
    eventType: z.string().min(1),
    endpoints: z
      .array(
        z.object({
          url: z.url(),
          secret: z.string().min(1),
        }),
      )
      .min(1),
  })
  .superRefine((data, ctx) => {
    const urls = data.endpoints.map((item) => item.url);
    if (new Set(urls).size !== urls.length) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate endpoints not allowed",
        path: ["endpoints"],
      });
    }
  });

export const updateEndpointSchema = z
  .object({
    eventType: z.string().min(1).optional(),
    url: z.url().optional(),
    isActive: z.boolean().optional(),
    secret: z.string().min(1).optional(),
  })
  .refine(
    (data) =>
      data.eventType !== undefined ||
      data.url !== undefined ||
      data.isActive !== undefined ||
      data.secret !== undefined,
    { message: "At least one field is required" },
  );

export type Webhook = z.infer<typeof webhookSchema>;
export type Event = z.infer<typeof eventSchema>;
export type CreateEndpointSchema = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointSchema = z.infer<typeof updateEndpointSchema>;
export type UpdateCustomerSchema = z.infer<typeof updateCustomerSchema>;
