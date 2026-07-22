import { z } from "zod";

import { operatingHoursSchema } from "./facility.validator";
import { moneySchema, rateRuleBodySchema } from "./rate-rule.validator";

export const courtStatuses = ["active", "maintenance", "inactive"] as const;

const courtBody = z.object({
  name: z.string().min(1).max(100).meta({ example: "Court 1" }),
  surfaceType: z.string().min(1).nullable().optional(),
  isIndoor: z.boolean(),
  hourlyRate: moneySchema.meta({
    description: "Base/fallback rate used when no rate rule matches.",
    example: 300,
  }),
  status: z.enum(courtStatuses).optional(),
  statusNote: z.string().nullable().optional().meta({ example: "Resurfacing until Aug 1" }),
  maintenanceStartsAt: z.iso.date().nullable().optional(),
  maintenanceEndsAt: z.iso.date().nullable().optional(),
  operatingHoursOverride: operatingHoursSchema.nullable().optional().meta({
    description: "Null inherits the facility's operating hours.",
  }),
  displayOrder: z.number().int().min(0).optional(),
  photoUrls: z.array(z.url()).nullable().optional(),
  amenities: z
    .array(z.string().min(1))
    .nullable()
    .optional()
    .meta({
      description: "Freeform descriptive tags, informational only.",
      example: ["Fan", "Benches"],
    }),
});

export const createCourtSchema = courtBody.extend({
  rateRules: z.array(rateRuleBodySchema).optional().meta({
    description: "Optional starting rate tiers created together with the court.",
  }),
});
export type CreateCourtInput = z.infer<typeof createCourtSchema>;

export const updateCourtSchema = courtBody.partial();
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;

export const courtResponseSchema = z
  .object({
    id: z.uuid(),
    facilityId: z.uuid(),
    name: z.string(),
    surfaceType: z.string().nullable(),
    isIndoor: z.boolean(),
    hourlyRate: z.number(),
    status: z.enum(courtStatuses),
    statusNote: z.string().nullable(),
    maintenanceStartsAt: z.iso.date().nullable(),
    maintenanceEndsAt: z.iso.date().nullable(),
    operatingHoursOverride: operatingHoursSchema.nullable(),
    displayOrder: z.number(),
    photoUrls: z.array(z.string()).nullable(),
    amenities: z.array(z.string()).nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "Court", description: "A bookable court." });
export type CourtResponse = z.infer<typeof courtResponseSchema>;
