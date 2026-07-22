import { z } from "zod";

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be a 24-hour HH:MM time")
  .meta({ description: "24-hour HH:MM time.", example: "06:00" });

const dayHoursSchema = z
  .tuple([timeStringSchema, timeStringSchema])
  .refine(([open, close]) => open < close, {
    error: "Opening time must be before closing time",
  })
  .nullable()
  .meta({
    description: "[open, close] window for the day, or null when closed that day.",
    example: ["06:00", "22:00"],
  });

export const operatingHoursSchema = z
  .strictObject({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema,
  })
  .meta({ id: "OperatingHours", description: "Weekly operating hours; a null day means closed." });

export type OperatingHours = z.infer<typeof operatingHoursSchema>;

export const slotGranularitySchema = z
  .union([z.literal(30), z.literal(60)])
  .meta({ description: "Public booking increment in minutes.", example: 60 });

export const updateFacilitySchema = z.object({
  name: z.string().min(1).max(200).optional().meta({ example: "Pickled PH" }),
  address: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  contactPhone: z.string().min(1).optional(),
  contactEmail: z.email().optional(),
  description: z.string().nullable().optional(),
  operatingHours: operatingHoursSchema.optional(),
  timezone: z.string().min(1).optional().meta({ example: "Asia/Manila" }),
  slotGranularityMinutes: slotGranularitySchema.optional(),
  bookingHoldMinutes: z.number().int().positive().optional().meta({
    description: "Minutes a public pending booking holds its slot before auto-releasing.",
    example: 15,
  }),
  photoUrls: z.array(z.url()).nullable().optional(),
  amenities: z
    .array(z.string().min(1))
    .nullable()
    .optional()
    .meta({
      description: "Freeform facility-wide tags, informational only.",
      example: ["Parking", "Showers"],
    }),
  facebookUrl: z.url().nullable().optional(),
  instagramUrl: z.url().nullable().optional(),
});
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;

export const facilityResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    address: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    contactPhone: z.string(),
    contactEmail: z.string(),
    description: z.string().nullable(),
    operatingHours: operatingHoursSchema,
    timezone: z.string(),
    slotGranularityMinutes: z.number(),
    bookingHoldMinutes: z.number(),
    photoUrls: z.array(z.string()).nullable(),
    amenities: z.array(z.string()).nullable(),
    facebookUrl: z.string().nullable(),
    instagramUrl: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "Facility", description: "The facility profile — a singleton config record." });
export type FacilityResponse = z.infer<typeof facilityResponseSchema>;
