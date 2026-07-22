import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { OperatingHours } from "@/validators/facility.validator";

export const facilityProfile = pgTable(
  "facility_profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    latitude: numeric("latitude", { mode: "number" }),
    longitude: numeric("longitude", { mode: "number" }),
    contactPhone: text("contact_phone").notNull(),
    contactEmail: text("contact_email").notNull(),
    description: text("description"),
    operatingHours: jsonb("operating_hours").$type<OperatingHours>().notNull(),
    timezone: text("timezone").default("Asia/Manila").notNull(),
    slotGranularityMinutes: integer("slot_granularity_minutes").default(60).notNull(),
    bookingHoldMinutes: integer("booking_hold_minutes").default(15).notNull(),
    photoUrls: text("photo_urls").array(),
    amenities: text("amenities").array(),
    facebookUrl: text("facebook_url"),
    instagramUrl: text("instagram_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "chk_facility_profile_slot_granularity",
      sql`${table.slotGranularityMinutes} in (30, 60)`,
    ),
  ],
);

export type FacilityProfile = typeof facilityProfile.$inferSelect;
export type NewFacilityProfile = typeof facilityProfile.$inferInsert;
