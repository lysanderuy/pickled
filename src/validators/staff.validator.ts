import { z } from "zod";

export const staffRoles = ["owner_admin", "staff"] as const;
export const staffStatuses = ["invited", "active", "disabled"] as const;

export const inviteStaffSchema = z.object({
  fullName: z.string().min(1).max(200).meta({ example: "Juan dela Cruz" }),
  email: z.email().meta({ description: "Login identity — immutable once the invite is accepted." }),
  phone: z.string().min(1).nullable().optional(),
  role: z.enum(staffRoles),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

// Email is intentionally absent — fixing a wrong email pre-acceptance means cancel + re-invite.
export const updateStaffSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).nullable().optional(),
  role: z.enum(staffRoles).optional(),
});
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const staffResponseSchema = z
  .object({
    id: z.uuid(),
    facilityId: z.uuid(),
    authUserId: z.uuid().nullable().meta({ description: "Null until the invite is accepted." }),
    fullName: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    role: z.enum(staffRoles),
    status: z.enum(staffStatuses),
    invitedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "Staff", description: "A staff member of the facility." });
export type StaffResponse = z.infer<typeof staffResponseSchema>;
