import { z } from "zod";

import { timeStringSchema } from "./facility.validator";
import { dayOfWeekSchema, moneySchema } from "./rate-rule.validator";

export const recurringBookingStatuses = ["active", "paused", "cancelled"] as const;

const timeWindowOrdered = (v: { startTime?: string; endTime?: string }) =>
  !v.startTime || !v.endTime || v.startTime < v.endTime;
const timeWindowError = { error: "endTime must be after startTime", path: ["endTime"] };

const recurringBookingCore = z.object({
  customerId: z.uuid(),
  courtId: z.uuid(),
  dayOfWeek: dayOfWeekSchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  startsOn: z.iso.date().meta({ description: "First occurrence.", example: "2026-08-03" }),
  endsOn: z.iso
    .date()
    .nullable()
    .optional()
    .meta({ description: "Null means ongoing/indefinite." }),
  rateOverride: moneySchema.nullable().optional().meta({
    description: "If set, always wins; otherwise rate rules resolve at generation time.",
  }),
  status: z.enum(recurringBookingStatuses).optional(),
});

export const createRecurringBookingSchema = recurringBookingCore.refine(
  timeWindowOrdered,
  timeWindowError,
);
export type CreateRecurringBookingInput = z.infer<typeof createRecurringBookingSchema>;

// Schedule fields are immutable after creation (materialized occurrences would
// go stale) — strict so an attempted court/day/time edit fails loudly, not silently.
export const updateRecurringBookingSchema = z.strictObject({
  status: z.enum(recurringBookingStatuses).optional(),
  endsOn: z.iso
    .date()
    .nullable()
    .optional()
    .meta({ description: "Null means ongoing/indefinite." }),
  rateOverride: moneySchema.nullable().optional(),
});
export type UpdateRecurringBookingInput = z.infer<typeof updateRecurringBookingSchema>;

export const recurringBookingResponseSchema = z
  .object({
    id: z.uuid(),
    facilityId: z.uuid(),
    customerId: z.uuid(),
    courtId: z.uuid(),
    dayOfWeek: z.number(),
    startTime: z.iso.time(),
    endTime: z.iso.time(),
    startsOn: z.iso.date(),
    endsOn: z.iso.date().nullable(),
    rateOverride: z.number().nullable(),
    status: z.enum(recurringBookingStatuses),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "RecurringBooking", description: "A standing weekly reservation template." });
export type RecurringBookingResponse = z.infer<typeof recurringBookingResponseSchema>;
