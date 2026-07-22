"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  CourtResponse,
  CreateCourtInput,
  UpdateCourtInput,
} from "@/validators/court.validator";

import { bookingKeys } from "./use-bookings";
import { rateRuleKeys } from "./use-rate-rules";

export const courtKeys = {
  all: ["courts"] as const,
  list: ["courts", "list"] as const,
  detail: (id: string) => ["courts", "detail", id] as const,
};

export function useCourts() {
  return useQuery({
    queryKey: courtKeys.list,
    queryFn: () => api.get<CourtResponse[]>("/api/courts"),
  });
}

function useInvalidateCourts() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: courtKeys.all });
    // Court names and rates feed the calendar and rate previews.
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    void queryClient.invalidateQueries({ queryKey: bookingKeys.ratePreviews });
  };
}

export function useCreateCourt() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: (input: CreateCourtInput) => api.post<CourtResponse>("/api/courts", input),
    onSuccess: () => {
      invalidate();
      // Nested rateRules[] creates rate rules alongside the court.
      void queryClient.invalidateQueries({ queryKey: rateRuleKeys.all });
    },
  });
}

export function useUpdateCourt() {
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCourtInput }) =>
      api.patch<CourtResponse>(`/api/courts/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCourt() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/api/courts/${id}`),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: rateRuleKeys.all });
    },
  });
}
