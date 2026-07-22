import "server-only";

import { asc, count, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookings, courts, rateRules, recurringBookings, type Court } from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import { assertOverrideWithinFacilityHours } from "@/lib/operating-hours";
import type { CreateCourtInput, UpdateCourtInput } from "@/validators/court.validator";

import { facilityService } from "./facility.service";

export const courtService = {
  async list(): Promise<Court[]> {
    return db.query.courts.findMany({
      orderBy: [asc(courts.displayOrder), asc(courts.name)],
    });
  },

  async getById(id: string): Promise<Court> {
    const court = await db.query.courts.findFirst({ where: eq(courts.id, id) });
    if (!court) throw new ServiceError("Court not found", 404);
    return court;
  },

  async create(input: CreateCourtInput): Promise<Court> {
    const facility = await facilityService.get();
    if (input.operatingHoursOverride) {
      assertOverrideWithinFacilityHours(input.operatingHoursOverride, facility.operatingHours);
    }
    const { rateRules: nestedRules, displayOrder, ...courtInput } = input;

    return db.transaction(async (tx) => {
      let order = displayOrder;
      if (order === undefined) {
        const [row] = await tx
          .select({ max: sql<number | null>`max(${courts.displayOrder})` })
          .from(courts);
        order = (row.max ?? -1) + 1;
      }
      const [court] = await tx
        .insert(courts)
        .values({ ...courtInput, facilityId: facility.id, displayOrder: order })
        .returning();
      if (nestedRules?.length) {
        await tx
          .insert(rateRules)
          .values(
            nestedRules.map((rule) => ({ ...rule, facilityId: facility.id, courtId: court.id })),
          );
      }
      return court;
    });
  },

  async update(id: string, input: UpdateCourtInput): Promise<Court> {
    await courtService.getById(id);
    if (input.operatingHoursOverride) {
      const facility = await facilityService.get();
      assertOverrideWithinFacilityHours(input.operatingHoursOverride, facility.operatingHours);
    }
    const [updated] = await db
      .update(courts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(courts.id, id))
      .returning();
    return updated;
  },

  async remove(id: string): Promise<void> {
    await courtService.getById(id);
    const [bookingCount] = await db
      .select({ n: count() })
      .from(bookings)
      .where(eq(bookings.courtId, id));
    if (bookingCount.n > 0) {
      throw new ServiceError(
        "Court has booking history and cannot be deleted — set its status to inactive instead",
        409,
      );
    }
    const [templateCount] = await db
      .select({ n: count() })
      .from(recurringBookings)
      .where(eq(recurringBookings.courtId, id));
    if (templateCount.n > 0) {
      throw new ServiceError(
        "Court has recurring bookings and cannot be deleted — set its status to inactive instead",
        409,
      );
    }
    await db.transaction(async (tx) => {
      await tx.delete(rateRules).where(eq(rateRules.courtId, id));
      await tx.delete(courts).where(eq(courts.id, id));
    });
  },
};
