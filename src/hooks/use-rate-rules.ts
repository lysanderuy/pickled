"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  CreateRateRuleInput,
  RateRuleResponse,
  UpdateRateRuleInput,
} from "@/validators/rate-rule.validator";

import { bookingKeys } from "./use-bookings";

export const rateRuleKeys = {
  all: ["rate-rules"] as const,
  list: (courtId?: string) => ["rate-rules", "list", courtId ?? "all"] as const,
  detail: (id: string) => ["rate-rules", "detail", id] as const,
};

export function useRateRules(courtId?: string) {
  return useQuery({
    queryKey: rateRuleKeys.list(courtId),
    queryFn: () =>
      api.get<RateRuleResponse[]>(
        courtId ? `/api/rate-rules?courtId=${courtId}` : "/api/rate-rules",
      ),
  });
}

function useInvalidateRateRules() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: rateRuleKeys.all });
    void queryClient.invalidateQueries({ queryKey: bookingKeys.ratePreviews });
  };
}

export function useCreateRateRule() {
  const invalidate = useInvalidateRateRules();
  return useMutation({
    mutationFn: (input: CreateRateRuleInput) =>
      api.post<RateRuleResponse>("/api/rate-rules", input),
    onSuccess: invalidate,
  });
}

export function useUpdateRateRule() {
  const invalidate = useInvalidateRateRules();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRateRuleInput }) =>
      api.patch<RateRuleResponse>(`/api/rate-rules/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteRateRule() {
  const invalidate = useInvalidateRateRules();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/api/rate-rules/${id}`),
    onSuccess: invalidate,
  });
}
