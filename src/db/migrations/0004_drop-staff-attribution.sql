ALTER TABLE "bookings" DROP CONSTRAINT "bookings_created_by_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "sales" DROP CONSTRAINT "sales_sold_by_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "sales" DROP CONSTRAINT "sales_voided_by_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "created_by_staff_id";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "sold_by_staff_id";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "voided_by_staff_id";