import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { facilityProfile } from "./facility-profile";

// phone/email are indexed but intentionally NOT unique — matching is fuzzy business
// logic (a household can share a phone), not a hard DB rule.
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .references(() => facilityProfile.id)
      .notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    isRegular: boolean("is_regular").default(false).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_customers_phone").on(table.phone),
    index("idx_customers_email").on(table.email),
  ],
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
