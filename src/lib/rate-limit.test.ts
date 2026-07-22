import { describe, expect, it } from "vitest";

import { checkRateLimit } from "./rate-limit";

// No Upstash env vars set — exercises the real unconfigured path (no mocking):
// a fresh clone must never fail-closed.
describe("checkRateLimit (Upstash unconfigured)", () => {
  it("allows requests on the default limiter", async () => {
    await expect(checkRateLimit("/api/profile", "1.2.3.4")).resolves.toEqual({ success: true });
  });

  it("allows requests on an overridden route", async () => {
    await expect(checkRateLimit("/api/auth/callback", "1.2.3.4")).resolves.toEqual({
      success: true,
    });
  });
});
