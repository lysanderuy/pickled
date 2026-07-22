import "server-only";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { bookings, customers, sales, type Booking, type Customer, type Sale } from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "@/validators/customer.validator";

import { facilityService } from "./facility.service";

export const customerService = {
  async list(query: ListCustomersQuery): Promise<Customer[]> {
    const term = query.search ? `%${query.search}%` : undefined;
    return db.query.customers.findMany({
      where: and(
        term
          ? or(
              ilike(customers.fullName, term),
              ilike(customers.phone, term),
              ilike(customers.email, term),
            )
          : undefined,
        query.isRegular === undefined ? undefined : eq(customers.isRegular, query.isRegular),
      ),
      orderBy: asc(customers.fullName),
    });
  },

  // Manual add: a phone/email match surfaces a conflict instead of silently
  // linking — staff explicitly intend to create a record here.
  async create(
    input: CreateCustomerInput,
    options?: { allowDuplicate?: boolean },
  ): Promise<Customer> {
    const facility = await facilityService.get();
    if (!options?.allowDuplicate) {
      const duplicate =
        (input.phone
          ? await db.query.customers.findFirst({ where: eq(customers.phone, input.phone) })
          : undefined) ??
        (input.email
          ? await db.query.customers.findFirst({ where: eq(customers.email, input.email) })
          : undefined);
      if (duplicate) {
        throw new ServiceError(
          `This phone/email already belongs to ${duplicate.fullName}`,
          409,
          { customerId: duplicate.id, customerName: duplicate.fullName },
          "duplicate_customer",
        );
      }
    }
    const [created] = await db
      .insert(customers)
      .values({ ...input, facilityId: facility.id })
      .returning();
    return created;
  },

  async getById(id: string): Promise<Customer> {
    const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) });
    if (!customer) throw new ServiceError("Customer not found", 404);
    return customer;
  },

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    await customerService.getById(id);
    const [updated] = await db
      .update(customers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updated;
  },

  async listBookings(customerId: string): Promise<Booking[]> {
    await customerService.getById(customerId);
    return db.query.bookings.findMany({
      where: eq(bookings.customerId, customerId),
      orderBy: [desc(bookings.bookingDate), desc(bookings.startTime)],
    });
  },

  async listSales(customerId: string): Promise<Sale[]> {
    await customerService.getById(customerId);
    return db.query.sales.findMany({
      where: eq(sales.customerId, customerId),
      orderBy: [desc(sales.saleDate), desc(sales.createdAt)],
    });
  },
};
