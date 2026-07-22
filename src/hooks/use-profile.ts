"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Profile } from "@/db/schema";
import { api } from "@/lib/api/client";
import type { UpdateProfileInput } from "@/validators/profile.validator";

// Example server-state hooks — replace/extend per project.

export const profileKeys = {
  me: ["profile", "me"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: () => api.get<Profile>("/api/profile"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<Profile>("/api/profile", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
    },
  });
}
