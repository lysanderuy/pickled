import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bookingSources, bookingStatuses, paymentStatuses } from "@/validators/booking.validator";

import { courts } from "./courts";
import { customers } from "./customers";
import { facilityProfile } from "./facility-profile";
import { recurringBookings } from "./recurring-bookings";

export const bookingSourceEnum = pgEnum("booking_source", bookingSources);
export const bookingStatusEnum = pgEnum("booking_status", bookingStatuses);
export const paymentStatusEnum = pgEnum("payment_status", paymentStatuses);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .references(() => facilityProfile.id)
      .notNull(),
    courtId: uuid("court_id")
      .references(() => courts.id)
      .notNull(),
    recurringBookingId: uuid("recurring_booking_id").references(() => recurringBookings.id),
    customerId: uuid("customer_id")
      .references(() => customers.id)
      .notNull(),
    bookingDate: date("booking_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    source: bookingSourceEnum("source").notNull(),
    status: bookingStatusEnum("status").notNull(),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    // Snapshot of the resolved rate at booking time — never recomputed later.
    rateAmount: numeric("rate_amount", { precision: 10, scale: 2, mode: "number" }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_bookings_court_id_booking_date").on(table.courtId, table.bookingDate),
    index("idx_bookings_status").on(table.status),
    // Backstop against concurrent materialization inserting the same occurrence twice.
    uniqueIndex("uq_bookings_recurring_occurrence").on(table.recurringBookingId, table.bookingDate),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
