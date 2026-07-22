import { z } from "zod";

import { moneySchema } from "./rate-rule.validator";

export const saleTypes = ["booking", "walk_in", "equipment_rental", "other"] as const;
export const paymentMethods = ["cash", "gcash", "bank_transfer", "other"] as const;

export const createSaleSchema = z.object({
  bookingId: z.uuid().nullable().optional().meta({ description: "Null for standalone sales." }),
  customerId: z.uuid().nullable().optional().meta({
    description:
      "Optional attribution for standalone sales; auto-filled from the booking when bookingId is set.",
  }),
  saleType: z.enum(saleTypes),
  description: z.string().min(1).meta({ example: "Paddle rental x2" }),
  amount: moneySchema,
  paymentMethod: z.enum(paymentMethods),
  saleDate: z.iso.date().optional().meta({ description: "Defaults to today when omitted." }),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const updateSaleSchema = z.object({
  saleType: z.enum(saleTypes).optional(),
  description: z.string().min(1).optional(),
  amount: moneySchema.optional(),
  paymentMethod: z.enum(paymentMethods).optional(),
  saleDate: z.iso.date().optional(),
});
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;

export const voidSaleSchema = z.object({
  voidReason: z.string().min(1).optional(),
});
export type VoidSaleInput = z.infer<typeof voidSaleSchema>;

export const listSalesQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  type: z.enum(saleTypes).optional(),
  paymentMethod: z.enum(paymentMethods).optional(),
});
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;

export const saleResponseSchema = z
  .object({
    id: z.uuid(),
    facilityId: z.uuid(),
    bookingId: z.uuid().nullable(),
    customerId: z.uuid().nullable(),
    saleType: z.enum(saleTypes),
    description: z.string(),
    amount: z.number(),
    paymentMethod: z.enum(paymentMethods),
    saleDate: z.iso.date(),
    voidedAt: z.iso.datetime().nullable().meta({
      description: "Set when voided — excluded from revenue totals but kept in the log.",
    }),
    voidReason: z.string().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Sale", description: "A revenue entry, linked to a booking or standalone." });
export type SaleResponse = z.infer<typeof saleResponseSchema>;
