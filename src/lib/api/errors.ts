import type { ApiErrorCode } from "@/types/api";

// Business-rule violation thrown by services; handleApiError maps it to `status`.
// `details` is serialized into the error response — hand-curated business data
// only (IDs, names shown to staff), never raw errors or DB internals.
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly details?: Record<string, unknown>,
    readonly code?: ApiErrorCode,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
