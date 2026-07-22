import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { courtStatuses } from "@/validators/court.validator";
import type { OperatingHours } from "@/validators/facility.validator";

import { facilityProfile } from "./facility-profile";

export const courtStatusEnum = pgEnum("court_status", courtStatuses);

export const courts = pgTable("courts", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .references(() => facilityProfile.id)
    .notNull(),
  name: text("name").notNull(),
  surfaceType: text("surface_type"),
  isIndoor: boolean("is_indoor").notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2, mode: "number" }).notNull(),
  status: courtStatusEnum("status").default("active").notNull(),
  statusNote: text("status_note"),
  maintenanceStartsAt: date("maintenance_starts_at"),
  maintenanceEndsAt: date("maintenance_ends_at"),
  operatingHoursOverride: jsonb("operating_hours_override").$type<OperatingHours>(),
  displayOrder: integer("display_order").notNull(),
  photoUrls: text("photo_urls").array(),
  amenities: text("amenities").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Court = typeof courts.$inferSelect;
export type NewCourt = typeof courts.$inferInsert;
