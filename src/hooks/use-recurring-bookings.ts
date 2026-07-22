"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  CreateRecurringBookingInput,
  RecurringBookingResponse,
  UpdateRecurringBookingInput,
} from "@/validators/recurring-booking.validator";

import { bookingKeys } from "./use-bookings";

export type RecurringBookingWithNames = RecurringBookingResponse & {
  customerName: string;
  courtName: string;
};

export const recurringBookingKeys = {
  all: ["recurring-bookings"] as const,
  list: ["recurring-bookings", "list"] as const,
  detail: (id: string) => ["recurring-bookings", "detail", id] as const,
};

export function useRecurringBookings() {
  return useQuery({
    queryKey: recurringBookingKeys.list,
    queryFn: () => api.get<RecurringBookingWithNames[]>("/api/recurring-bookings"),
  });
}

function useInvalidateRecurringBookings() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: recurringBookingKeys.all });
    // Templates materialize into bookings/calendar rows on the next read.
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
  };
}

export function useCreateRecurringBooking() {
  const invalidate = useInvalidateRecurringBookings();
  return useMutation({
    mutationFn: (input: CreateRecurringBookingInput) =>
      api.post<RecurringBookingResponse>("/api/recurring-bookings", input),
    onSuccess: invalidate,
  });
}

export function useUpdateRecurringBooking() {
  const invalidate = useInvalidateRecurringBookings();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecurringBookingInput }) =>
      api.patch<RecurringBookingResponse>(`/api/recurring-bookings/${id}`, input),
    onSuccess: invalidate,
  });
}
