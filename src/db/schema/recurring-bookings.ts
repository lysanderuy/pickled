import {
  date,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { recurringBookingStatuses } from "@/validators/recurring-booking.validator";

import { courts } from "./courts";
import { customers } from "./customers";
import { facilityProfile } from "./facility-profile";

export const recurringBookingStatusEnum = pgEnum(
  "recurring_booking_status",
  recurringBookingStatuses,
);

export const recurringBookings = pgTable("recurring_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .references(() => facilityProfile.id)
    .notNull(),
  customerId: uuid("customer_id")
    .references(() => customers.id)
    .notNull(),
  courtId: uuid("court_id")
    .references(() => courts.id)
    .notNull(),
  dayOfWeek: smallint("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on"),
  rateOverride: numeric("rate_override", { precision: 10, scale: 2, mode: "number" }),
  status: recurringBookingStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type RecurringBooking = typeof recurringBookings.$inferSelect;
export type NewRecurringBooking = typeof recurringBookings.$inferInsert;
