import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "./profile.validator";

describe("updateProfileSchema", () => {
  it("accepts a valid display name", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Jane Doe" });
    expect(result.success).toBe(true);
  });

  it("accepts an omitted display name", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects an empty display name", () => {
    const result = updateProfileSchema.safeParse({ displayName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a display name over 100 characters", () => {
    const result = updateProfileSchema.safeParse({ displayName: "a".repeat(101) });
    expect(result.success).toBe(false);
  });
});
