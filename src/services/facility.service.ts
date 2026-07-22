import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { facilityProfile, recurringBookings, type FacilityProfile } from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import { toHhmm } from "@/lib/dates";
import {
  assertOverrideWithinFacilityHours,
  assertWithinEffectiveHours,
} from "@/lib/operating-hours";
import type { OperatingHours, UpdateFacilityInput } from "@/validators/facility.validator";

// The effective-hours invariant runs both ways: court overrides are validated
// against facility hours on court save, so shrinking facility hours must not
// silently orphan existing overrides or active standing reservations.
async function assertHoursChangeIsSafe(newHours: OperatingHours): Promise<void> {
  const problems: string[] = [];

  const allCourts = await db.query.courts.findMany();
  for (const court of allCourts) {
    if (!court.operatingHoursOverride) continue;
    try {
      assertOverrideWithinFacilityHours(court.operatingHoursOverride, newHours);
    } catch (error) {
      problems.push(`${court.name}: ${(error as Error).message}`);
    }
  }

  const templates = await db.query.recurringBookings.findMany({
    where: eq(recurringBookings.status, "active"),
  });
  const courtById = new Map(allCourts.map((c) => [c.id, c]));
  for (const template of templates) {
    const court = courtById.get(template.courtId);
    if (!court) continue;
    try {
      assertWithinEffectiveHours(
        court,
        newHours,
        template.dayOfWeek,
        toHhmm(template.startTime),
        toHhmm(template.endTime),
      );
    } catch (error) {
      problems.push(`Standing reservation: ${(error as Error).message}`);
    }
  }

  if (problems.length > 0) {
    throw new ServiceError(
      `These hours would conflict with existing settings — fix those first. ${problems.join("; ")}`,
      409,
    );
  }
}

export const facilityService = {
  // Single-tenant: the seeded singleton row IS the facility — facility_id is
  // resolved here inside services, never taken as caller input.
  async get(): Promise<FacilityProfile> {
    const facility = await db.query.facilityProfile.findFirst();
    if (!facility) {
      throw new ServiceError("Facility profile is not seeded", 500);
    }
    return facility;
  },

  async update(input: UpdateFacilityInput): Promise<FacilityProfile> {
    const facility = await facilityService.get();
    if (input.operatingHours) {
      await assertHoursChangeIsSafe(input.operatingHours);
    }
    const [updated] = await db
      .update(facilityProfile)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(facilityProfile.id, facility.id))
      .returning();
    return updated;
  },
};
