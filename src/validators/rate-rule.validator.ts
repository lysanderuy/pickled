import { z } from "zod";

import { timeStringSchema } from "./facility.validator";

export const moneySchema = z
  .number()
  .positive()
  .max(99_999_999.99)
  .meta({ description: "Monetary amount, fits numeric(10,2).", example: 350 });

export const dayOfWeekSchema = z
  .number()
  .int()
  .min(0)
  .max(6)
  .meta({ description: "Day of week, 0=Sun..6=Sat.", example: 6 });

const rateRuleCore = z.object({
  label: z.string().min(1).max(100).meta({
    description: "Internal label shown in the Rates tab, not customer-facing.",
    example: "Weekend Peak",
  }),
  daysOfWeek: z
    .array(dayOfWeekSchema)
    .min(1)
    .meta({ example: [0, 6] }),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  rate: moneySchema,
  priority: z.number().int().optional().meta({
    description: "Tie-breaker when multiple rules of equal specificity match; higher wins.",
    example: 0,
  }),
  isActive: z.boolean().optional(),
});

const timeWindowOrdered = (v: { startTime?: string; endTime?: string }) =>
  !v.startTime || !v.endTime || v.startTime < v.endTime;
const timeWindowError = { error: "endTime must be after startTime", path: ["endTime"] };

export const rateRuleBodySchema = rateRuleCore.refine(timeWindowOrdered, timeWindowError);
export type RateRuleBodyInput = z.infer<typeof rateRuleBodySchema>;

export const createRateRuleSchema = rateRuleCore
  .extend({
    courtId: z
      .uuid()
      .nullable()
      .optional()
      .meta({ description: "Null (or omitted) applies the rule facility-wide." }),
  })
  .refine(timeWindowOrdered, timeWindowError);
export type CreateRateRuleInput = z.infer<typeof createRateRuleSchema>;

export const updateRateRuleSchema = rateRuleCore
  .extend({ courtId: z.uuid().nullable() })
  .partial()
  .refine(timeWindowOrdered, timeWindowError);
export type UpdateRateRuleInput = z.infer<typeof updateRateRuleSchema>;

export const listRateRulesQuerySchema = z.object({
  courtId: z.uuid().optional(),
});
export type ListRateRulesQuery = z.infer<typeof listRateRulesQuerySchema>;

export const rateRuleResponseSchema = z
  .object({
    id: z.uuid(),
    facilityId: z.uuid(),
    courtId: z.uuid().nullable().meta({ description: "Null means facility-wide." }),
    label: z.string(),
    daysOfWeek: z.array(z.number()),
    startTime: z.iso.time(),
    endTime: z.iso.time(),
    rate: z.number(),
    priority: z.number(),
    isActive: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({
    id: "RateRule",
    description: "A tiered pricing rule for a court or the whole facility.",
  });
export type RateRuleResponse = z.infer<typeof rateRuleResponseSchema>;
