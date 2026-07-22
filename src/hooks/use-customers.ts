"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { BookingResponse } from "@/validators/booking.validator";
import type {
  CreateCustomerInput,
  CustomerResponse,
  UpdateCustomerInput,
} from "@/validators/customer.validator";
import type { SaleResponse } from "@/validators/sale.validator";

export type CustomerFilters = {
  search?: string;
  isRegular?: boolean;
};

export type CreateCustomerRequest = CreateCustomerInput & { allowDuplicate?: boolean };

export const customerKeys = {
  all: ["customers"] as const,
  list: (filters: CustomerFilters) => ["customers", "list", filters] as const,
  detail: (id: string) => ["customers", "detail", id] as const,
  bookings: (id: string) => ["customers", "detail", id, "bookings"] as const,
  sales: (id: string) => ["customers", "detail", id, "sales"] as const,
};

function customerListPath(filters: CustomerFilters) {
  const search = new URLSearchParams();
  if (filters.search) search.set("search", filters.search);
  if (filters.isRegular !== undefined) search.set("isRegular", String(filters.isRegular));
  const qs = search.toString();
  return qs ? `/api/customers?${qs}` : "/api/customers";
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => api.get<CustomerResponse[]>(customerListPath(filters)),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => api.get<CustomerResponse>(`/api/customers/${id}`),
  });
}

export function useCustomerBookings(id: string) {
  return useQuery({
    queryKey: customerKeys.bookings(id),
    queryFn: () => api.get<BookingResponse[]>(`/api/customers/${id}/bookings`),
  });
}

export function useCustomerSales(id: string) {
  return useQuery({
    queryKey: customerKeys.sales(id),
    queryFn: () => api.get<SaleResponse[]>(`/api/customers/${id}/sales`),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerRequest) =>
      api.post<CustomerResponse>("/api/customers", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerInput }) =>
      api.patch<CustomerResponse>(`/api/customers/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
      // Calendar rows embed the customer name.
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
