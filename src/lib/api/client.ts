import type { ApiErrorCode, ApiResponse } from "@/types/api";

// Client-side fetch wrapper.

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: ApiErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!json) {
    throw new ApiError("Invalid response from server", res.status);
  }
  if (!json.success) {
    throw new ApiError(json.error, res.status, json.code, json.details);
  }

  return json.data;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
