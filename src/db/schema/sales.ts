import { date, index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { paymentMethods, saleTypes } from "@/validators/sale.validator";

import { bookings } from "./bookings";
import { customers } from "./customers";
import { facilityProfile } from "./facility-profile";

export const saleTypeEnum = pgEnum("sale_type", saleTypes);
export const paymentMethodEnum = pgEnum("payment_method", paymentMethods);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .references(() => facilityProfile.id)
      .notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    customerId: uuid("customer_id").references(() => customers.id),
    saleType: saleTypeEnum("sale_type").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2, mode: "number" }).notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    saleDate: date("sale_date").notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_sales_sale_date").on(table.saleDate)],
);

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
