"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  InviteStaffInput,
  StaffResponse,
  UpdateStaffInput,
} from "@/validators/staff.validator";

import { meKeys } from "./use-me";

export const staffKeys = {
  all: ["staff"] as const,
  list: ["staff", "list"] as const,
  detail: (id: string) => ["staff", "detail", id] as const,
};

export function useStaffList() {
  return useQuery({
    queryKey: staffKeys.list,
    queryFn: () => api.get<StaffResponse[]>("/api/staff"),
  });
}

function useInvalidateStaff() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: staffKeys.all });
    void queryClient.invalidateQueries({ queryKey: meKeys.me });
  };
}

export function useInviteStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (input: InviteStaffInput) => api.post<StaffResponse>("/api/staff", input),
    onSuccess: invalidate,
  });
}

export function useUpdateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStaffInput }) =>
      api.patch<StaffResponse>(`/api/staff/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDisableStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (id: string) => api.post<StaffResponse>(`/api/staff/${id}/disablement`, {}),
    onSuccess: invalidate,
  });
}

export function useReinstateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (id: string) => api.post<StaffResponse>(`/api/staff/${id}/reinstatement`, {}),
    onSuccess: invalidate,
  });
}
