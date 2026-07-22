// Stable machine-readable codes — clients branch on these, never on message text.
export type ApiErrorCode = "duplicate_customer";

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ApiErrorCode; details?: Record<string, unknown> };
