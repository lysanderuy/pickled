import "server-only";

import {
  and,
  asc,
  eq,
  getTableColumns,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import { bookings, courts, customers, recurringBookings, type RecurringBooking } from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import { addDays, dayOfWeekOf, toHhmm, todayIn } from "@/lib/dates";
import type {
  CreateRecurringBookingInput,
  UpdateRecurringBookingInput,
} from "@/validators/recurring-booking.validator";

import { assertWithinEffectiveHours } from "@/lib/operating-hours";

import { MATERIALIZATION_WEEKS } from "./booking.service";
import { facilityService } from "./facility.service";

interface TemplateSlot {
  courtId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startsOn: string;
  endsOn?: string | null;
}

// §3.1 for templates: a standing reservation must not overlap another active
// template on the same court/day, nor any blocking booking it would
// materialize on top of within the generation window.
async function assertTemplateSlotFree(
  slot: TemplateSlot,
  timezone: string,
  excludeTemplateId?: string,
): Promise<void> {
  const templateClash = await db.query.recurringBookings.findFirst({
    where: and(
      eq(recurringBookings.courtId, slot.courtId),
      eq(recurringBookings.dayOfWeek, slot.dayOfWeek),
      eq(recurringBookings.status, "active"),
      excludeTemplateId ? ne(recurringBookings.id, excludeTemplateId) : undefined,
      lt(recurringBookings.startTime, slot.endTime),
      gt(recurringBookings.endTime, slot.startTime),
      or(isNull(recurringBookings.endsOn), gte(recurringBookings.endsOn, slot.startsOn)),
      slot.endsOn ? lte(recurringBookings.startsOn, slot.endsOn) : undefined,
    ),
  });
  if (templateClash) {
    throw new ServiceError(
      `Overlaps another standing reservation on this court (${toHhmm(templateClash.startTime)}-${toHhmm(templateClash.endTime)})`,
      409,
    );
  }

  const from = todayIn(timezone);
  const to = addDays(from, MATERIALIZATION_WEEKS * 7);
  let date = from > slot.startsOn ? from : slot.startsOn;
  date = addDays(date, (slot.dayOfWeek - dayOfWeekOf(date) + 7) % 7);
  const dates: string[] = [];
  for (; date <= to && (!slot.endsOn || date <= slot.endsOn); date = addDays(date, 7)) {
    dates.push(date);
  }
  if (dates.length === 0) return;

  const bookingClash = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.courtId, slot.courtId),
      inArray(bookings.bookingDate, dates),
      excludeTemplateId
        ? or(
            isNull(bookings.recurringBookingId),
            ne(bookings.recurringBookingId, excludeTemplateId),
          )
        : undefined,
      lt(bookings.startTime, slot.endTime),
      gt(bookings.endTime, slot.startTime),
      or(
        eq(bookings.status, "confirmed"),
        and(
          eq(bookings.status, "pending_confirmation"),
          or(isNull(bookings.holdExpiresAt), gt(bookings.holdExpiresAt, new Date())),
        ),
      ),
    ),
  });
  if (bookingClash) {
    throw new ServiceError(
      `Conflicts with an existing booking on ${bookingClash.bookingDate} (${toHhmm(bookingClash.startTime)}-${toHhmm(bookingClash.endTime)})`,
      409,
    );
  }
}

export const recurringBookingService = {
  async list() {
    return db
      .select({
        ...getTableColumns(recurringBookings),
        customerName: customers.fullName,
        courtName: courts.name,
      })
      .from(recurringBookings)
      .innerJoin(customers, eq(recurringBookings.customerId, customers.id))
      .innerJoin(courts, eq(recurringBookings.courtId, courts.id))
      .orderBy(asc(recurringBookings.dayOfWeek), asc(recurringBookings.startTime));
  },

  async create(input: CreateRecurringBookingInput): Promise<RecurringBooking> {
    const facility = await facilityService.get();
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, input.customerId),
    });
    if (!customer) throw new ServiceError("Customer not found", 404);
    const court = await db.query.courts.findFirst({ where: eq(courts.id, input.courtId) });
    if (!court) throw new ServiceError("Court not found", 404);
    assertWithinEffectiveHours(
      court,
      facility.operatingHours,
      input.dayOfWeek,
      input.startTime,
      input.endTime,
    );
    await assertTemplateSlotFree(input, facility.timezone);
    const [created] = await db
      .insert(recurringBookings)
      .values({ ...input, facilityId: facility.id })
      .returning();
    return created;
  },

  // Schedule fields (customer/court/day/time/startsOn) are immutable — already-
  // materialized occurrences would go stale. Cancel + recreate instead.
  async update(id: string, input: UpdateRecurringBookingInput): Promise<RecurringBooking> {
    const existing = await db.query.recurringBookings.findFirst({
      where: eq(recurringBookings.id, id),
    });
    if (!existing) throw new ServiceError("Recurring booking not found", 404);

    // Resuming or extending an active template exposes new occurrence dates
    // that were never conflict-checked; own materialized rows are excluded.
    const status = input.status ?? existing.status;
    if (status === "active") {
      const facility = await facilityService.get();
      await assertTemplateSlotFree(
        {
          courtId: existing.courtId,
          dayOfWeek: existing.dayOfWeek,
          startTime: toHhmm(existing.startTime),
          endTime: toHhmm(existing.endTime),
          startsOn: existing.startsOn,
          endsOn: input.endsOn !== undefined ? input.endsOn : existing.endsOn,
        },
        facility.timezone,
        id,
      );
    }

    const [updated] = await db
      .update(recurringBookings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(recurringBookings.id, id))
      .returning();
    return updated;
  },
};
