import { describe, expect, it } from "vitest";

import { operatingHoursSchema, updateFacilitySchema } from "./facility.validator";

const openWeek = {
  mon: ["06:00", "22:00"],
  tue: ["06:00", "22:00"],
  wed: ["06:00", "22:00"],
  thu: ["06:00", "22:00"],
  fri: ["06:00", "22:00"],
  sat: ["08:00", "20:00"],
  sun: ["08:00", "20:00"],
};

describe("operatingHoursSchema", () => {
  it("accepts a full week of open/close tuples", () => {
    expect(operatingHoursSchema.safeParse(openWeek).success).toBe(true);
  });

  it("accepts null days as closed", () => {
    expect(operatingHoursSchema.safeParse({ ...openWeek, mon: null, sun: null }).success).toBe(
      true,
    );
  });

  it("rejects a day whose open time is not before its close time", () => {
    expect(operatingHoursSchema.safeParse({ ...openWeek, tue: ["22:00", "06:00"] }).success).toBe(
      false,
    );
    expect(operatingHoursSchema.safeParse({ ...openWeek, tue: ["10:00", "10:00"] }).success).toBe(
      false,
    );
  });

  it("rejects times that are not 24-hour HH:MM", () => {
    expect(operatingHoursSchema.safeParse({ ...openWeek, wed: ["6:00", "22:00"] }).success).toBe(
      false,
    );
    expect(operatingHoursSchema.safeParse({ ...openWeek, wed: ["06:00", "24:00"] }).success).toBe(
      false,
    );
    expect(
      operatingHoursSchema.safeParse({ ...openWeek, wed: ["06:00:00", "22:00"] }).success,
    ).toBe(false);
  });

  it("rejects a week with a missing day", () => {
    const missingSunday: Partial<typeof openWeek> = { ...openWeek };
    delete missingSunday.sun;
    expect(operatingHoursSchema.safeParse(missingSunday).success).toBe(false);
  });

  it("rejects unknown day keys", () => {
    expect(operatingHoursSchema.safeParse({ ...openWeek, holiday: null }).success).toBe(false);
  });
});

describe("updateFacilitySchema", () => {
  it("accepts slot granularity of 30 or 60 only", () => {
    expect(updateFacilitySchema.safeParse({ slotGranularityMinutes: 30 }).success).toBe(true);
    expect(updateFacilitySchema.safeParse({ slotGranularityMinutes: 60 }).success).toBe(true);
    expect(updateFacilitySchema.safeParse({ slotGranularityMinutes: 45 }).success).toBe(false);
  });

  it("requires bookingHoldMinutes to be a positive integer", () => {
    expect(updateFacilitySchema.safeParse({ bookingHoldMinutes: 15 }).success).toBe(true);
    expect(updateFacilitySchema.safeParse({ bookingHoldMinutes: 0 }).success).toBe(false);
    expect(updateFacilitySchema.safeParse({ bookingHoldMinutes: 7.5 }).success).toBe(false);
  });
});
