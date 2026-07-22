"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  BookingResponse,
  CompleteBookingInput,
  CreateBookingInput,
  RecordBookingPaymentInput,
  UpdateBookingInput,
  bookingStatuses,
} from "@/validators/booking.validator";
import type { SaleResponse } from "@/validators/sale.validator";

import { customerKeys } from "./use-customers";
import { saleKeys } from "./use-sales";

export type BookingStatus = (typeof bookingStatuses)[number];

export type BookingFilters = {
  status?: BookingStatus;
  courtId?: string;
  from?: string;
  to?: string;
};

export type CalendarEntry = BookingResponse & { customerName: string; courtName: string };

export type RatePreviewParams = {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type RatePreview = { rate: number; hours: number; total: number };

export type BookingPaymentResult = { booking: BookingResponse; sale: SaleResponse | null };

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (filters: BookingFilters) => ["bookings", "list", filters] as const,
  detail: (id: string) => ["bookings", "detail", id] as const,
  calendar: (from: string, to: string, courtId?: string) =>
    ["bookings", "calendar", from, to, courtId ?? "all"] as const,
  ratePreviews: ["rate-preview"] as const,
  ratePreview: (params: RatePreviewParams) => ["rate-preview", params] as const,
};

function bookingListPath(filters: BookingFilters) {
  const search = new URLSearchParams();
  if (filters.status) search.set("status", filters.status);
  if (filters.courtId) search.set("courtId", filters.courtId);
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  const qs = search.toString();
  return qs ? `/api/bookings?${qs}` : "/api/bookings";
}

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => api.get<BookingResponse[]>(bookingListPath(filters)),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => api.get<BookingResponse>(`/api/bookings/${id}`),
  });
}

export function useCalendar(from: string, to: string, courtId?: string) {
  const search = new URLSearchParams({ from, to });
  if (courtId) search.set("courtId", courtId);
  return useQuery({
    queryKey: bookingKeys.calendar(from, to, courtId),
    queryFn: () => api.get<CalendarEntry[]>(`/api/calendar?${search.toString()}`),
  });
}

export function useRatePreview(params: RatePreviewParams | null) {
  return useQuery({
    queryKey: params ? bookingKeys.ratePreview(params) : bookingKeys.ratePreviews,
    queryFn: () => {
      if (!params) throw new Error("Rate preview params missing");
      const search = new URLSearchParams({ ...params });
      return api.get<RatePreview>(`/api/rate-preview?${search.toString()}`);
    },
    enabled: params !== null,
    retry: false,
  });
}

function useInvalidateBookings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: bookingKeys.all });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.post<BookingResponse>("/api/bookings", input),
    onSuccess: () => {
      void invalidate();
      // Booking creation may resolve or create a customer record.
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBookingInput }) =>
      api.patch<BookingResponse>(`/api/bookings/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useConfirmBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (id: string) => api.post<BookingResponse>(`/api/bookings/${id}/confirmation`, {}),
    onSuccess: invalidate,
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (id: string) => api.post<BookingResponse>(`/api/bookings/${id}/cancellation`, {}),
    onSuccess: invalidate,
  });
}

export function useCompleteBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompleteBookingInput }) =>
      api.post<BookingResponse>(`/api/bookings/${id}/completion`, input),
    onSuccess: invalidate,
  });
}

export function useRecordBookingPayment() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecordBookingPaymentInput }) =>
      api.post<BookingPaymentResult>(`/api/bookings/${id}/payment`, input),
    onSuccess: () => {
      void invalidate();
      void queryClient.invalidateQueries({ queryKey: saleKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
