"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { FacilityResponse, UpdateFacilityInput } from "@/validators/facility.validator";

export const facilityKeys = {
  facility: ["facility"] as const,
};

export function useFacility() {
  return useQuery({
    queryKey: facilityKeys.facility,
    queryFn: () => api.get<FacilityResponse>("/api/facility"),
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFacilityInput) => api.patch<FacilityResponse>("/api/facility", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: facilityKeys.facility }),
  });
}
