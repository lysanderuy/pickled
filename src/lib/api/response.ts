import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ApiErrorCode, ApiResponse } from "@/types/api";

import { ServiceError } from "./errors";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function apiError(
  error: string,
  status = 400,
  extra?: { code?: ApiErrorCode; details?: Record<string, unknown> },
) {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error,
      ...(extra?.code && { code: extra.code }),
      ...(extra?.details && { details: extra.details }),
    },
    { status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ServiceError) {
    return apiError(error.message, error.status, { code: error.code, details: error.details });
  }

  // Postgres exclusion violation (excl_bookings_slot_overlap) — a concurrent
  // request won the slot between our conflict check and the write.
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23P01") {
    return apiError("This time slot was just taken by another booking", 409);
  }

  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    return apiError(message, 422);
  }

  console.error("[api]", error);
  return apiError("Internal server error", 500);
}
