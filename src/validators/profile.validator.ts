import { z } from "zod";

// Example validator — replace/extend per project.
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .meta({ description: "Display name shown throughout the app.", example: "Jane Doe" }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const profileResponseSchema = z
  .object({
    id: z.string().uuid().meta({
      description: "Profile ID (matches the Supabase auth user ID).",
      example: "5f8d0d55-1c8b-4e2a-9c3d-7e6b1a2f4d90",
    }),
    email: z
      .string()
      .email()
      .meta({ description: "Account email address.", example: "jane@example.com" }),
    displayName: z
      .string()
      .nullable()
      .meta({ description: "Display name shown throughout the app.", example: "Jane Doe" }),
    welcomeEmailSentAt: z.string().datetime().nullable().meta({
      description: "Timestamp the welcome email was sent, if any.",
      example: "2026-01-15T09:30:00.000Z",
    }),
    createdAt: z.string().datetime().meta({
      description: "Timestamp the profile was created.",
      example: "2026-01-01T00:00:00.000Z",
    }),
    updatedAt: z.string().datetime().meta({
      description: "Timestamp the profile was last updated.",
      example: "2026-01-15T09:30:00.000Z",
    }),
  })
  .meta({ id: "Profile", description: "A user profile." });

export type ProfileResponse = z.infer<typeof profileResponseSchema>;
