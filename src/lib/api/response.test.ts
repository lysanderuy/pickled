import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";

import { apiError, apiSuccess, handleApiError } from "./response";

describe("apiSuccess", () => {
  it("wraps data in the success envelope", async () => {
    const response = apiSuccess({ id: "1" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: { id: "1" } });
  });

  it("respects a custom status code", () => {
    const response = apiSuccess({ id: "1" }, 201);
    expect(response.status).toBe(201);
  });
});

describe("apiError", () => {
  it("wraps a message in the error envelope with a 400 default", async () => {
    const response = apiError("bad request");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: "bad request" });
  });
});

describe("handleApiError", () => {
  it("formats ZodError issues into a 422 response", async () => {
    const schema = z.object({ displayName: z.string().min(1) });
    const result = schema.safeParse({ displayName: "" });
    const error = result.success ? undefined : new ZodError(result.error.issues);

    const response = handleApiError(error);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("displayName");
  });

  it("falls back to a 500 for unknown errors", async () => {
    const response = handleApiError(new Error("boom"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Internal server error",
    });
  });
});
