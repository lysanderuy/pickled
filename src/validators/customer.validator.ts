import { z } from "zod";

export const createCustomerSchema = z.object({
  fullName: z.string().min(1).max(200).meta({ example: "Jane Doe" }),
  phone: z.string().min(1).nullable().optional().meta({
    description: "Primary field used for matching/dedupe on new bookings.",
  }),
  email: z.email().nullable().optional(),
  isRegular: z.boolean().optional().meta({
    description: "Manually toggled by staff; independent of recurring bookings.",
  }),
  notes: z.string().nullable().optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const listCustomersQuerySchema = z.object({
  search: z.string().min(1).optional(),
  isRegular: z.stringbool().optional(),
});
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

export const customerResponseSchema = z
  .object({
    id: z.uuid(),
    facilityId: z.uuid(),
    fullName: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    isRegular: z.boolean(),
    notes: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({
    id: "Customer",
    description: "Anyone who has booked, walked in, or been manually added.",
  });
export type CustomerResponse = z.infer<typeof customerResponseSchema>;
