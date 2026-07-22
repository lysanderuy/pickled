import { z } from "zod";

import { timeStringSchema } from "./facility.validator";
import { paymentMethods } from "./sale.validator";

export const bookingSources = ["public", "admin", "recurring"] as const;
export const bookingStatuses = [
  "pending_confirmation",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
  "expired",
] as const;
export const paymentStatuses = ["unpaid", "paid", "partial"] as const;

const timeWindowOrdered = (v: { startTime?: string; endTime?: string }) =>
  !v.startTime || !v.endTime || v.startTime < v.endTime;
const timeWindowError = { error: "endTime must be after startTime", path: ["endTime"] };

const bookingCustomerSchema = z
  .object({
    fullName: z.string().min(1).max(200).meta({ example: "Jane Doe" }),
    phone: z.string().min(1).optional().meta({ example: "+63 917 123 4567" }),
    email: z.email().optional(),
  })
  .refine((c) => Boolean(c.phone || c.email), {
    error: "Provide a phone number or an email",
    path: ["phone"],
  })
  .meta({ description: "Contact info used to resolve or create the customer record." });

export const createBookingSchema = z
  .object({
    courtId: z.uuid(),
    bookingDate: z.iso.date().meta({ example: "2026-08-01" }),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    customer: bookingCustomerSchema,
    status: z.enum(["confirmed", "pending_confirmation"]).optional().meta({
      description: "Admin bookings default to confirmed; staff may hold one as pending.",
    }),
    notes: z.string().nullable().optional(),
  })
  .refine(timeWindowOrdered, timeWindowError);
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = z
  .object({
    courtId: z.uuid().optional(),
    bookingDate: z.iso.date().optional(),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(timeWindowOrdered, timeWindowError);
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

export const listBookingsQuerySchema = z.object({
  status: z.enum(bookingStatuses).optional(),
  courtId: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

export const completeBookingSchema = z.object({
  status: z.enum(["completed", "no_show"]),
});
export type CompleteBookingInput = z.infer<typeof completeBookingSchema>;

export const recordBookingPaymentSchema = z.object({
  paymentMethod: z.enum(paymentMethods),
  createSale: z.boolean().optional().meta({
    description: "Also create a linked sales row for the booking amount.",
  }),
});
export type RecordBookingPaymentInput = z.infer<typeof recordBookingPaymentSchema>;

export const bookingResponseSchema = z
  .object({
    id: z.uuid(),
    facilityId: z.uuid(),
    courtId: z.uuid(),
    recurringBookingId: z.uuid().nullable(),
    customerId: z.uuid(),
    bookingDate: z.iso.date(),
    startTime: z.iso.time(),
    endTime: z.iso.time(),
    source: z.enum(bookingSources),
    status: z.enum(bookingStatuses),
    holdExpiresAt: z.iso.datetime().nullable().meta({
      description: "Set only for public bookings; the pending hold lapses at this time.",
    }),
    rateAmount: z.number().meta({ description: "Rate snapshot taken at booking time." }),
    paymentStatus: z.enum(paymentStatuses),
    notes: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "Booking", description: "A single calendar occurrence on a court." });
export type BookingResponse = z.infer<typeof bookingResponseSchema>;
