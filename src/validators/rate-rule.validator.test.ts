import { describe, expect, it } from "vitest";

import { createRateRuleSchema, updateRateRuleSchema } from "./rate-rule.validator";

const validRule = {
  label: "Weekend Peak",
  daysOfWeek: [0, 6],
  startTime: "17:00",
  endTime: "21:00",
  rate: 450,
};

describe("createRateRuleSchema", () => {
  it("accepts a valid rule, with courtId null meaning facility-wide", () => {
    expect(createRateRuleSchema.safeParse(validRule).success).toBe(true);
    expect(createRateRuleSchema.safeParse({ ...validRule, courtId: null }).success).toBe(true);
  });

  it("rejects startTime at or after endTime", () => {
    expect(
      createRateRuleSchema.safeParse({ ...validRule, startTime: "21:00", endTime: "17:00" })
        .success,
    ).toBe(false);
    expect(
      createRateRuleSchema.safeParse({ ...validRule, startTime: "17:00", endTime: "17:00" })
        .success,
    ).toBe(false);
  });

  it("bounds daysOfWeek to integers 0-6 and requires at least one day", () => {
    expect(createRateRuleSchema.safeParse({ ...validRule, daysOfWeek: [7] }).success).toBe(false);
    expect(createRateRuleSchema.safeParse({ ...validRule, daysOfWeek: [-1] }).success).toBe(false);
    expect(createRateRuleSchema.safeParse({ ...validRule, daysOfWeek: [1.5] }).success).toBe(false);
    expect(createRateRuleSchema.safeParse({ ...validRule, daysOfWeek: [] }).success).toBe(false);
    expect(
      createRateRuleSchema.safeParse({ ...validRule, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }).success,
    ).toBe(true);
  });

  it("rejects non-positive rates", () => {
    expect(createRateRuleSchema.safeParse({ ...validRule, rate: 0 }).success).toBe(false);
    expect(createRateRuleSchema.safeParse({ ...validRule, rate: -100 }).success).toBe(false);
  });
});

describe("updateRateRuleSchema", () => {
  it("allows partial updates but still enforces time ordering when both times are present", () => {
    expect(updateRateRuleSchema.safeParse({ label: "Weekday Off-Peak" }).success).toBe(true);
    expect(updateRateRuleSchema.safeParse({ startTime: "10:00" }).success).toBe(true);
    expect(updateRateRuleSchema.safeParse({ startTime: "10:00", endTime: "09:00" }).success).toBe(
      false,
    );
  });
});
