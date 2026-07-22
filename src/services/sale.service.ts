import "server-only";

import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { bookings, sales, type Sale } from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import { todayIn } from "@/lib/dates";
import type {
  CreateSaleInput,
  ListSalesQuery,
  UpdateSaleInput,
  VoidSaleInput,
} from "@/validators/sale.validator";

import { facilityService } from "./facility.service";

export const saleService = {
  async list(query: ListSalesQuery): Promise<Sale[]> {
    // Voided rows stay in the log (audit trail) — flagged, never filtered out.
    return db.query.sales.findMany({
      where: and(
        query.from ? gte(sales.saleDate, query.from) : undefined,
        query.to ? lte(sales.saleDate, query.to) : undefined,
        query.type ? eq(sales.saleType, query.type) : undefined,
        query.paymentMethod ? eq(sales.paymentMethod, query.paymentMethod) : undefined,
      ),
      orderBy: [desc(sales.saleDate), desc(sales.createdAt)],
    });
  },

  async create(input: CreateSaleInput): Promise<Sale> {
    const facility = await facilityService.get();
    let customerId = input.customerId ?? null;
    if (input.bookingId) {
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, input.bookingId),
      });
      if (!booking) throw new ServiceError("Booking not found", 404);
      // Attribution follows the booking's customer when linked.
      customerId = booking.customerId;
    }
    const [created] = await db
      .insert(sales)
      .values({
        facilityId: facility.id,
        bookingId: input.bookingId ?? null,
        customerId,
        saleType: input.saleType,
        description: input.description,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        saleDate: input.saleDate ?? todayIn(facility.timezone),
      })
      .returning();
    return created;
  },

  async getById(id: string): Promise<Sale> {
    const sale = await db.query.sales.findFirst({ where: eq(sales.id, id) });
    if (!sale) throw new ServiceError("Sale not found", 404);
    return sale;
  },

  async update(id: string, input: UpdateSaleInput): Promise<Sale> {
    const sale = await saleService.getById(id);
    // sales has no updated_at column — an all-undefined patch would make an
    // empty SET, which drizzle rejects.
    if (Object.values(input).every((value) => value === undefined)) {
      if (sale.voidedAt) throw new ServiceError("Cannot edit a voided sale", 409);
      return sale;
    }
    // Guarded on voided_at so an edit racing a void loses instead of landing.
    const [updated] = await db
      .update(sales)
      .set(input)
      .where(and(eq(sales.id, id), isNull(sales.voidedAt)))
      .returning();
    if (!updated) throw new ServiceError("Cannot edit a voided sale", 409);
    return updated;
  },

  async void(id: string, input: VoidSaleInput): Promise<Sale> {
    await saleService.getById(id);
    // Guarded update: a concurrent void loses here instead of overwriting.
    const [voided] = await db
      .update(sales)
      .set({
        voidedAt: new Date(),
        voidReason: input.voidReason ?? null,
      })
      .where(and(eq(sales.id, id), isNull(sales.voidedAt)))
      .returning();
    if (!voided) throw new ServiceError("Sale is already voided", 409);
    return voided;
  },
};
