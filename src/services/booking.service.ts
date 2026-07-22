import "server-only";

import {
  and,
  asc,
  eq,
  getTableColumns,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  bookings,
  courts,
  customers,
  recurringBookings,
  sales,
  type Booking,
  type NewBooking,
  type Sale,
} from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import { addDays, dayOfWeekOf, minutesOf, toHhmm, todayIn } from "@/lib/dates";
import type {
  CompleteBookingInput,
  CreateBookingInput,
  ListBookingsQuery,
  RecordBookingPaymentInput,
  UpdateBookingInput,
} from "@/validators/booking.validator";

import { assertWithinEffectiveHours } from "@/lib/operating-hours";

import { facilityService } from "./facility.service";
import { rateRuleService } from "./rate-rule.service";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const MATERIALIZATION_WEEKS = 8;
const calendarStatuses = ["pending_confirmation", "confirmed", "completed", "no_show"] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Lazy hold expiry — one set-based UPDATE, no background job.
async function expireLapsedHolds(): Promise<void> {
  await db
    .update(bookings)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(bookings.status, "pending_confirmation"),
        isNotNull(bookings.holdExpiresAt),
        lt(bookings.holdExpiresAt, new Date()),
      ),
    );
}

// On-demand materialization for the rolling now → +8 weeks window.
// Paused/cancelled templates stop generating but keep already-materialized rows.
async function materializeRecurring(): Promise<void> {
  const facility = await facilityService.get();
  const templates = await db.query.recurringBookings.findMany({
    where: eq(recurringBookings.status, "active"),
  });
  if (templates.length === 0) return;

  const from = todayIn(facility.timezone);
  const to = addDays(from, MATERIALIZATION_WEEKS * 7);
  const existing = await db
    .select({
      recurringBookingId: bookings.recurringBookingId,
      bookingDate: bookings.bookingDate,
    })
    .from(bookings)
    .where(
      and(
        isNotNull(bookings.recurringBookingId),
        gte(bookings.bookingDate, from),
        lte(bookings.bookingDate, to),
      ),
    );
  const materialized = new Set(existing.map((b) => `${b.recurringBookingId}:${b.bookingDate}`));

  const rows: NewBooking[] = [];
  for (const template of templates) {
    let date = from > template.startsOn ? from : template.startsOn;
    date = addDays(date, (template.dayOfWeek - dayOfWeekOf(date) + 7) % 7);
    const missing: string[] = [];
    for (; date <= to && (!template.endsOn || date <= template.endsOn); date = addDays(date, 7)) {
      if (!materialized.has(`${template.id}:${date}`)) missing.push(date);
    }
    if (missing.length === 0) continue;

    const hours = (minutesOf(template.endTime) - minutesOf(template.startTime)) / 60;
    const hourly =
      template.rateOverride ??
      (await rateRuleService.resolveRate(template.courtId, template.dayOfWeek, template.startTime));
    const rateAmount = round2(hourly * hours);
    for (const bookingDate of missing) {
      rows.push({
        facilityId: facility.id,
        courtId: template.courtId,
        recurringBookingId: template.id,
        customerId: template.customerId,
        bookingDate,
        startTime: toHhmm(template.startTime),
        endTime: toHhmm(template.endTime),
        source: "recurring",
        status: "confirmed",
        rateAmount,
      });
    }
  }
  // Concurrent materializations race to the same rows; the unique index on
  // (recurring_booking_id, booking_date) makes the losers no-ops. A 23P01
  // (slot exclusion) on the batch falls back to per-row inserts so one
  // conflicting occurrence can't block the rest — or the whole read path.
  if (rows.length > 0) {
    try {
      await db.insert(bookings).values(rows).onConflictDoNothing();
    } catch (error) {
      if (!(
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23P01"
      ))
        throw error;
      for (const row of rows) {
        try {
          await db.insert(bookings).values(row).onConflictDoNothing();
        } catch (rowError) {
          const code =
            typeof rowError === "object" && rowError !== null && "code" in rowError
              ? rowError.code
              : undefined;
          if (code !== "23P01") throw rowError;
        }
      }
    }
  }
}

// Blocked by confirmed bookings and pending ones whose hold hasn't lapsed.
// Admin-held pendings have no hold_expires_at and block indefinitely.
async function assertNoConflict(
  courtId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
): Promise<void> {
  const conflict = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.courtId, courtId),
      eq(bookings.bookingDate, bookingDate),
      excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
      lt(bookings.startTime, endTime),
      gt(bookings.endTime, startTime),
      or(
        eq(bookings.status, "confirmed"),
        and(
          eq(bookings.status, "pending_confirmation"),
          or(isNull(bookings.holdExpiresAt), gt(bookings.holdExpiresAt, new Date())),
        ),
      ),
    ),
  });
  if (conflict) {
    throw new ServiceError(
      `Slot conflicts with a ${conflict.status === "confirmed" ? "confirmed" : "pending"} booking (${toHhmm(conflict.startTime)}-${toHhmm(conflict.endTime)})`,
      409,
    );
  }
}

// Customer resolution: phone match → email match → create. The stored name
// stays canonical — a differently-typed name on a booking never overwrites it.
async function resolveCustomer(
  tx: Tx,
  facilityId: string,
  contact: CreateBookingInput["customer"],
): Promise<string> {
  // Serialize concurrent resolves for the same contact — without this, two
  // simultaneous first-time bookings both miss the lookup and create twins.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${contact.phone ?? contact.email ?? contact.fullName}))`,
  );
  if (contact.phone) {
    const match = await tx.query.customers.findFirst({
      where: and(eq(customers.facilityId, facilityId), eq(customers.phone, contact.phone)),
    });
    if (match) return match.id;
  }
  if (contact.email) {
    const match = await tx.query.customers.findFirst({
      where: and(eq(customers.facilityId, facilityId), eq(customers.email, contact.email)),
    });
    if (match) return match.id;
  }
  const [created] = await tx
    .insert(customers)
    .values({
      facilityId,
      fullName: contact.fullName,
      phone: contact.phone ?? null,
      email: contact.email ?? null,
    })
    .returning();
  return created.id;
}

async function mustGet(id: string): Promise<Booking> {
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, id) });
  if (!booking) throw new ServiceError("Booking not found", 404);
  return booking;
}

export const bookingService = {
  async list(query: ListBookingsQuery): Promise<Booking[]> {
    await expireLapsedHolds();
    await materializeRecurring();
    return db.query.bookings.findMany({
      where: and(
        query.status ? eq(bookings.status, query.status) : undefined,
        query.courtId ? eq(bookings.courtId, query.courtId) : undefined,
        query.from ? gte(bookings.bookingDate, query.from) : undefined,
        query.to ? lte(bookings.bookingDate, query.to) : undefined,
      ),
      orderBy: [asc(bookings.bookingDate), asc(bookings.startTime)],
    });
  },

  async calendar(query: { from: string; to: string; courtId?: string }) {
    await expireLapsedHolds();
    await materializeRecurring();
    return db
      .select({
        ...getTableColumns(bookings),
        customerName: customers.fullName,
        courtName: courts.name,
      })
      .from(bookings)
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .where(
        and(
          gte(bookings.bookingDate, query.from),
          lte(bookings.bookingDate, query.to),
          query.courtId ? eq(bookings.courtId, query.courtId) : undefined,
          inArray(bookings.status, [...calendarStatuses]),
        ),
      )
      .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
  },

  async create(input: CreateBookingInput): Promise<Booking> {
    const facility = await facilityService.get();
    const court = await db.query.courts.findFirst({ where: eq(courts.id, input.courtId) });
    if (!court) throw new ServiceError("Court not found", 404);
    // Maintenance/inactive courts are still bookable by staff — the soft
    // warning is client-side.
    assertWithinEffectiveHours(
      court,
      facility.operatingHours,
      dayOfWeekOf(input.bookingDate),
      input.startTime,
      input.endTime,
    );

    await expireLapsedHolds();
    await materializeRecurring();
    await assertNoConflict(input.courtId, input.bookingDate, input.startTime, input.endTime);

    const hourly = await rateRuleService.resolveRate(
      input.courtId,
      dayOfWeekOf(input.bookingDate),
      input.startTime,
    );
    const hours = (minutesOf(input.endTime) - minutesOf(input.startTime)) / 60;
    const rateAmount = round2(hourly * hours);

    return db.transaction(async (tx) => {
      const customerId = await resolveCustomer(tx, facility.id, input.customer);
      const [created] = await tx
        .insert(bookings)
        .values({
          facilityId: facility.id,
          courtId: input.courtId,
          customerId,
          bookingDate: input.bookingDate,
          startTime: input.startTime,
          endTime: input.endTime,
          source: "admin",
          // Admin pending bookings get no hold_expires_at — only public ones auto-expire.
          status: input.status ?? "confirmed",
          rateAmount,
          notes: input.notes ?? null,
        })
        .returning();
      return created;
    });
  },

  async getById(id: string): Promise<Booking> {
    await expireLapsedHolds();
    return mustGet(id);
  },

  async update(id: string, input: UpdateBookingInput): Promise<Booking> {
    await expireLapsedHolds();
    const booking = await mustGet(id);
    if (booking.status !== "pending_confirmation" && booking.status !== "confirmed") {
      throw new ServiceError(`Cannot edit a ${booking.status} booking`, 409);
    }
    const courtId = input.courtId ?? booking.courtId;
    const bookingDate = input.bookingDate ?? booking.bookingDate;
    const startTime = input.startTime ?? toHhmm(booking.startTime);
    const endTime = input.endTime ?? toHhmm(booking.endTime);
    // Cross-field merge can invert the window even when the input alone is valid.
    if (startTime >= endTime) throw new ServiceError("endTime must be after startTime", 422);

    const scheduleChanged =
      courtId !== booking.courtId ||
      bookingDate !== booking.bookingDate ||
      startTime !== toHhmm(booking.startTime) ||
      endTime !== toHhmm(booking.endTime);
    if (scheduleChanged) {
      const facility = await facilityService.get();
      const court = await db.query.courts.findFirst({ where: eq(courts.id, courtId) });
      if (!court) throw new ServiceError("Court not found", 404);
      assertWithinEffectiveHours(
        court,
        facility.operatingHours,
        dayOfWeekOf(bookingDate),
        startTime,
        endTime,
      );
      await materializeRecurring();
      await assertNoConflict(courtId, bookingDate, startTime, endTime, id);
    }

    // rate_amount is a snapshot — never recomputed on edit.
    const [updated] = await db
      .update(bookings)
      .set({ courtId, bookingDate, startTime, endTime, notes: input.notes, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  },

  // Staff can confirm even after the hold lapsed (status already flipped
  // to expired) — the conflict re-check decides, not the hold.
  async confirm(id: string): Promise<Booking> {
    await expireLapsedHolds();
    const booking = await mustGet(id);
    if (booking.status !== "pending_confirmation" && booking.status !== "expired") {
      throw new ServiceError(`Cannot confirm a ${booking.status} booking`, 409);
    }
    await materializeRecurring();
    await assertNoConflict(
      booking.courtId,
      booking.bookingDate,
      toHhmm(booking.startTime),
      toHhmm(booking.endTime),
      id,
    );
    const [updated] = await db
      .update(bookings)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  },

  async cancel(id: string): Promise<Booking> {
    await expireLapsedHolds();
    const booking = await mustGet(id);
    if (
      booking.status === "cancelled" ||
      booking.status === "completed" ||
      booking.status === "no_show"
    ) {
      throw new ServiceError(`Cannot cancel a ${booking.status} booking`, 409);
    }
    const [updated] = await db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  },

  async complete(id: string, input: CompleteBookingInput): Promise<Booking> {
    const booking = await mustGet(id);
    if (booking.status !== "confirmed") {
      throw new ServiceError(`Only confirmed bookings can be marked ${input.status}`, 409);
    }
    const [updated] = await db
      .update(bookings)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  },

  // Mark paid, optionally auto-creating the linked sales row in one action.
  async recordPayment(
    id: string,
    input: RecordBookingPaymentInput,
  ): Promise<{ booking: Booking; sale: Sale | null }> {
    const booking = await mustGet(id);
    const facility = await facilityService.get();

    return db.transaction(async (tx) => {
      // Guarded update: a concurrent payment loses here instead of double-logging.
      const [updated] = await tx
        .update(bookings)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(and(eq(bookings.id, id), ne(bookings.paymentStatus, "paid")))
        .returning();
      if (!updated) throw new ServiceError("Booking is already paid", 409);
      let sale: Sale | null = null;
      if (input.createSale) {
        const [createdSale] = await tx
          .insert(sales)
          .values({
            facilityId: facility.id,
            bookingId: booking.id,
            customerId: booking.customerId,
            saleType: "booking",
            description: `Court booking ${booking.bookingDate} ${toHhmm(booking.startTime)}-${toHhmm(booking.endTime)}`,
            amount: booking.rateAmount,
            paymentMethod: input.paymentMethod,
            saleDate: todayIn(facility.timezone),
          })
          .returning();
        sale = createdSale;
      }
      return { booking: updated, sale };
    });
  },

  expireLapsedHolds,
  materializeRecurring,
};
