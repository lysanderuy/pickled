"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { StaffResponse } from "@/validators/staff.validator";

export const meKeys = {
  me: ["me"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: meKeys.me,
    queryFn: () => api.get<StaffResponse>("/api/me"),
  });
}
