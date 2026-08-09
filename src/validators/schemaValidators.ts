import z from "zod";

export const webhookSchema = z.object({
  url: z.string(),
  method: z.enum(["POST"]),
  headers: z.record(z.string(), z.string()),
  body: z.any(),
});

export const eventSchema = z.object({
    eventType : z.string(),
    payload: z.record(z.string(), z.any()),

})

export const customerSchema = z.object({
    name: z.string().min(1).max(30),
});


export type Webhook = z.infer<typeof webhookSchema>;
export type Event = z.infer<typeof eventSchema>;