CREATE TYPE "public"."booking_source" AS ENUM('public', 'admin', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending_confirmation', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid', 'partial');--> statement-breakpoint
CREATE TYPE "public"."court_status" AS ENUM('active', 'maintenance', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."recurring_booking_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'gcash', 'bank_transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."sale_type" AS ENUM('booking', 'walk_in', 'equipment_rental', 'other');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('owner_admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"court_id" uuid NOT NULL,
	"recurring_booking_id" uuid,
	"customer_id" uuid NOT NULL,
	"booking_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"source" "booking_source" NOT NULL,
	"status" "booking_status" NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"rate_amount" numeric(10, 2) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"created_by_staff_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"surface_type" text,
	"is_indoor" boolean NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"status" "court_status" DEFAULT 'active' NOT NULL,
	"status_note" text,
	"maintenance_starts_at" date,
	"maintenance_ends_at" date,
	"operating_hours_override" jsonb,
	"display_order" integer NOT NULL,
	"photo_urls" text[],
	"amenities" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"is_regular" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facility_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric,
	"longitude" numeric,
	"contact_phone" text NOT NULL,
	"contact_email" text NOT NULL,
	"description" text,
	"operating_hours" jsonb NOT NULL,
	"timezone" text DEFAULT 'Asia/Manila' NOT NULL,
	"slot_granularity_minutes" integer DEFAULT 60 NOT NULL,
	"booking_hold_minutes" integer DEFAULT 15 NOT NULL,
	"photo_urls" text[],
	"amenities" text[],
	"facebook_url" text,
	"instagram_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_facility_profile_slot_granularity" CHECK ("facility_profile"."slot_granularity_minutes" in (30, 60))
);
--> statement-breakpoint
CREATE TABLE "rate_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"court_id" uuid,
	"label" text NOT NULL,
	"days_of_week" smallint[] NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"court_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"rate_override" numeric(10, 2),
	"status" "recurring_booking_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"booking_id" uuid,
	"customer_id" uuid,
	"sale_type" "sale_type" NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"sold_by_staff_id" uuid NOT NULL,
	"sale_date" date NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by_staff_id" uuid,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" "staff_role" NOT NULL,
	"status" "staff_status" DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_facility_id_facility_profile_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_recurring_booking_id_recurring_bookings_id_fk" FOREIGN KEY ("recurring_booking_id") REFERENCES "public"."recurring_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_facility_id_facility_profile_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_facility_id_facility_profile_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_rules" ADD CONSTRAINT "rate_rules_facility_id_facility_profile_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_rules" ADD CONSTRAINT "rate_rules_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_facility_id_facility_profile_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_facility_id_facility_profile_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_sold_by_staff_id_staff_id_fk" FOREIGN KEY ("sold_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_voided_by_staff_id_staff_id_fk" FOREIGN KEY ("voided_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_facility_id_facility_profile_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facility_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_court_id_booking_date" ON "bookings" USING btree ("court_id","booking_date");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_customers_email" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_rate_rules_court_id" ON "rate_rules" USING btree ("court_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_date" ON "sales" USING btree ("sale_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_staff_email" ON "staff" USING btree ("email");