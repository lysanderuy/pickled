"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  CreateSaleInput,
  SaleResponse,
  UpdateSaleInput,
  paymentMethods,
  saleTypes,
} from "@/validators/sale.validator";

import { customerKeys } from "./use-customers";

export type SaleType = (typeof saleTypes)[number];
export type PaymentMethod = (typeof paymentMethods)[number];

export type SaleFilters = {
  from?: string;
  to?: string;
  type?: SaleType;
  paymentMethod?: PaymentMethod;
};

export const saleKeys = {
  all: ["sales"] as const,
  list: (filters: SaleFilters) => ["sales", "list", filters] as const,
  detail: (id: string) => ["sales", "detail", id] as const,
};

function saleListPath(filters: SaleFilters) {
  const search = new URLSearchParams();
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  if (filters.type) search.set("type", filters.type);
  if (filters.paymentMethod) search.set("paymentMethod", filters.paymentMethod);
  const qs = search.toString();
  return qs ? `/api/sales?${qs}` : "/api/sales";
}

export function useSales(filters: SaleFilters = {}) {
  return useQuery({
    queryKey: saleKeys.list(filters),
    queryFn: () => api.get<SaleResponse[]>(saleListPath(filters)),
  });
}

function useInvalidateSales() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: saleKeys.all });
    // Customer detail pages list that customer's sales.
    void queryClient.invalidateQueries({ queryKey: customerKeys.all });
  };
}

export function useCreateSale() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => api.post<SaleResponse>("/api/sales", input),
    onSuccess: invalidate,
  });
}

export function useUpdateSale() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSaleInput }) =>
      api.patch<SaleResponse>(`/api/sales/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useVoidSale() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: ({ id, voidReason }: { id: string; voidReason?: string }) =>
      api.post<SaleResponse>(`/api/sales/${id}/void`, voidReason ? { voidReason } : {}),
    onSuccess: invalidate,
  });
}
