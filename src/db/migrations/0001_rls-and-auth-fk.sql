-- Custom migration: RLS on every table (locks PostgREST away from the anon
-- key — Drizzle connects as postgres and bypasses RLS) + FK to auth.users,
-- which drizzle-kit can't express since it doesn't manage the auth schema.

ALTER TABLE "facility_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Staff rows outlive their auth account (soft-delete model, staff.status).
ALTER TABLE "staff"
  ADD CONSTRAINT "staff_auth_user_id_auth_users_fk"
  FOREIGN KEY ("auth_user_id") REFERENCES auth.users(id) ON DELETE SET NULL;
