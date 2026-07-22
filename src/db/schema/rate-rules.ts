import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { courts } from "./courts";
import { facilityProfile } from "./facility-profile";

export const rateRules = pgTable(
  "rate_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .references(() => facilityProfile.id)
      .notNull(),
    courtId: uuid("court_id").references(() => courts.id),
    label: text("label").notNull(),
    daysOfWeek: smallint("days_of_week").array().notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    rate: numeric("rate", { precision: 10, scale: 2, mode: "number" }).notNull(),
    priority: integer("priority").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_rate_rules_court_id").on(table.courtId)],
);

export type RateRule = typeof rateRules.$inferSelect;
export type NewRateRule = typeof rateRules.$inferInsert;
