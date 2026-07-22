-- DB-level backstop for the §3.1 conflict rule: two blocking bookings can
-- never overlap on the same court+date, no matter how requests race. The app
-- flips lapsed holds to `expired` before writing, so `pending_confirmation`
-- here always means a live hold. 23P01 violations map to 409 in handleApiError.

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TYPE "timerange" AS RANGE (subtype = time);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "excl_bookings_slot_overlap"
  EXCLUDE USING gist (
    court_id WITH =,
    booking_date WITH =,
    timerange(start_time, end_time) WITH &&
  ) WHERE (status IN ('confirmed', 'pending_confirmation'));
