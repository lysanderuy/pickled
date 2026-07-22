import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { staffRoles, staffStatuses } from "@/validators/staff.validator";

import { facilityProfile } from "./facility-profile";

export const staffRoleEnum = pgEnum("staff_role", staffRoles);
export const staffStatusEnum = pgEnum("staff_status", staffStatuses);

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .references(() => facilityProfile.id)
      .notNull(),
    // Points at auth.users, which drizzle doesn't manage — the FK is added via a custom migration.
    authUserId: uuid("auth_user_id"),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    role: staffRoleEnum("role").notNull(),
    status: staffStatusEnum("status").default("invited").notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_staff_email").on(table.email)],
);

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
