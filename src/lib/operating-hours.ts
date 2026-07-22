import type { Court } from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import type { OperatingHours } from "@/validators/facility.validator";

// Index order matches day-of-week 0=Sun..6=Sat used by rate_rules and recurring_bookings.
export const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function effectiveDayWindow(
  override: OperatingHours | null,
  facilityHours: OperatingHours,
  dayOfWeek: number,
): [string, string] | null {
  const hours = override ?? facilityHours;
  return hours[dayKeys[dayOfWeek]];
}

export function assertWithinEffectiveHours(
  court: Pick<Court, "name" | "operatingHoursOverride">,
  facilityHours: OperatingHours,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): void {
  const window = effectiveDayWindow(court.operatingHoursOverride, facilityHours, dayOfWeek);
  if (!window) {
    throw new ServiceError(`${court.name} is closed on ${dayKeys[dayOfWeek]}`, 422);
  }
  if (startTime < window[0] || endTime > window[1]) {
    throw new ServiceError(
      `${court.name} operates ${window[0]}-${window[1]} on ${dayKeys[dayOfWeek]}`,
      422,
    );
  }
}

export function assertOverrideWithinFacilityHours(
  override: OperatingHours,
  facilityHours: OperatingHours,
): void {
  for (const day of dayKeys) {
    const courtWindow = override[day];
    if (!courtWindow) continue;
    const facilityWindow = facilityHours[day];
    if (!facilityWindow) {
      throw new ServiceError(
        `The facility is closed on ${day} — the court override cannot open that day`,
        422,
      );
    }
    if (courtWindow[0] < facilityWindow[0] || courtWindow[1] > facilityWindow[1]) {
      throw new ServiceError(
        `Court hours on ${day} (${courtWindow[0]}-${courtWindow[1]}) fall outside facility hours (${facilityWindow[0]}-${facilityWindow[1]})`,
        422,
      );
    }
  }
}
