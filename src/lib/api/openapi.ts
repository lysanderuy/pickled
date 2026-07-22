import { z } from "zod";
import {
  createDocument,
  type ZodOpenApiOperationObject,
  type ZodOpenApiParameters,
  type ZodOpenApiResponsesObject,
} from "zod-openapi";

import {
  bookingResponseSchema,
  completeBookingSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  recordBookingPaymentSchema,
  updateBookingSchema,
} from "@/validators/booking.validator";
import {
  courtResponseSchema,
  createCourtSchema,
  updateCourtSchema,
} from "@/validators/court.validator";
import {
  createCustomerSchema,
  customerResponseSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "@/validators/customer.validator";
import {
  facilityResponseSchema,
  timeStringSchema,
  updateFacilitySchema,
} from "@/validators/facility.validator";
import {
  createRateRuleSchema,
  listRateRulesQuerySchema,
  rateRuleResponseSchema,
  updateRateRuleSchema,
} from "@/validators/rate-rule.validator";
import {
  createRecurringBookingSchema,
  recurringBookingResponseSchema,
  updateRecurringBookingSchema,
} from "@/validators/recurring-booking.validator";
import {
  createSaleSchema,
  listSalesQuerySchema,
  saleResponseSchema,
  updateSaleSchema,
  voidSaleSchema,
} from "@/validators/sale.validator";
import {
  inviteStaffSchema,
  staffResponseSchema,
  updateStaffSchema,
} from "@/validators/staff.validator";

function successEnvelope<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

const errorEnvelope = z.object({
  success: z.literal(false),
  error: z.string().meta({ example: "Unauthorized" }),
  code: z
    .enum(["duplicate_customer"])
    .optional()
    .meta({ description: "Stable machine-readable error code, present on branchable errors." }),
  details: z
    .record(z.string(), z.unknown())
    .optional()
    .meta({ description: "Curated business data accompanying the error (e.g. customerId)." }),
});

const errorDescriptions = {
  "401": "Not authenticated as active staff",
  "403": "Requires the owner_admin role",
  "404": "Not found",
  "409": "Business-rule conflict",
  "422": "Validation failed",
} as const;
type ErrorCode = keyof typeof errorDescriptions;

const idParamSchema = z.object({ id: z.uuid() });

const json = (schema: z.ZodType) => ({ content: { "application/json": { schema } } });

// Query/body/response shapes that exist only at the route level (no validator export).
const ratePreviewQuerySchema = z.object({
  courtId: z.uuid(),
  date: z.iso.date(),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
});

const ratePreviewResponseSchema = z.object({
  rate: z.number().meta({ description: "Resolved per-hour rate." }),
  hours: z.number(),
  total: z.number(),
});

const calendarQuerySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  courtId: z.uuid().optional(),
});

const calendarEntrySchema = bookingResponseSchema.extend({
  customerName: z.string(),
  courtName: z.string(),
});

const createCustomerRequestSchema = createCustomerSchema.extend({
  allowDuplicate: z.boolean().optional().meta({
    description: "Create the record even when the phone/email matches an existing customer.",
  }),
});

const recurringBookingWithNamesSchema = recurringBookingResponseSchema.extend({
  customerName: z.string(),
  courtName: z.string(),
});

const bookingPaymentResponseSchema = z.object({
  booking: bookingResponseSchema,
  sale: saleResponseSchema
    .nullable()
    .meta({ description: "The auto-created sales row when createSale was true, else null." }),
});

interface OperationInput {
  summary: string;
  tag: string;
  data: z.ZodType;
  status?: "200" | "201";
  hasId?: boolean;
  query?: ZodOpenApiParameters["query"];
  body?: z.ZodType;
  errors?: ErrorCode[];
}

function operation({
  summary,
  tag,
  data,
  status = "200",
  hasId,
  query,
  body,
  errors = [],
}: OperationInput): ZodOpenApiOperationObject {
  const responses: ZodOpenApiResponsesObject = {};
  responses[status] = { description: "Success", ...json(successEnvelope(data)) };
  for (const code of ["401" as const, ...errors]) {
    responses[code] = { description: errorDescriptions[code], ...json(errorEnvelope) };
  }
  return {
    summary,
    tags: [tag],
    ...(hasId || query
      ? {
          requestParams: { ...(hasId ? { path: idParamSchema } : {}), ...(query ? { query } : {}) },
        }
      : {}),
    ...(body ? { requestBody: json(body) } : {}),
    responses,
  };
}

export const openApiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    title: "Pickled API",
    version: "1.0.0",
  },
  paths: {
    "/api/facility": {
      get: operation({
        summary: "Get the facility profile",
        tag: "Facility",
        data: facilityResponseSchema,
      }),
      patch: operation({
        summary: "Update the facility profile",
        tag: "Facility",
        data: facilityResponseSchema,
        body: updateFacilitySchema,
        errors: ["422"],
      }),
    },
    "/api/courts": {
      get: operation({
        summary: "List courts",
        tag: "Courts",
        data: z.array(courtResponseSchema),
      }),
      post: operation({
        summary: "Create a court, optionally with starting rate rules",
        tag: "Courts",
        data: courtResponseSchema,
        status: "201",
        body: createCourtSchema,
        errors: ["422"],
      }),
    },
    "/api/courts/{id}": {
      get: operation({
        summary: "Get a court",
        tag: "Courts",
        data: courtResponseSchema,
        hasId: true,
        errors: ["404"],
      }),
      patch: operation({
        summary: "Update a court",
        tag: "Courts",
        data: courtResponseSchema,
        hasId: true,
        body: updateCourtSchema,
        errors: ["404", "422"],
      }),
      delete: operation({
        summary: "Delete a court without booking history",
        tag: "Courts",
        data: z.null(),
        hasId: true,
        errors: ["404", "409"],
      }),
    },
    "/api/rate-rules": {
      get: operation({
        summary: "List rate rules",
        tag: "Rate Rules",
        data: z.array(rateRuleResponseSchema),
        query: listRateRulesQuerySchema,
        errors: ["422"],
      }),
      post: operation({
        summary: "Create a rate rule",
        tag: "Rate Rules",
        data: rateRuleResponseSchema,
        status: "201",
        body: createRateRuleSchema,
        errors: ["404", "422"],
      }),
    },
    "/api/rate-rules/{id}": {
      get: operation({
        summary: "Get a rate rule",
        tag: "Rate Rules",
        data: rateRuleResponseSchema,
        hasId: true,
        errors: ["404"],
      }),
      patch: operation({
        summary: "Update a rate rule",
        tag: "Rate Rules",
        data: rateRuleResponseSchema,
        hasId: true,
        body: updateRateRuleSchema,
        errors: ["404", "422"],
      }),
      delete: operation({
        summary: "Delete a rate rule",
        tag: "Rate Rules",
        data: z.null(),
        hasId: true,
        errors: ["404"],
      }),
    },
    "/api/rate-preview": {
      get: operation({
        summary: "Preview the resolved rate for a slot",
        tag: "Rate Rules",
        data: ratePreviewResponseSchema,
        query: ratePreviewQuerySchema,
        errors: ["404", "422"],
      }),
    },
    "/api/bookings": {
      get: operation({
        summary: "List bookings",
        tag: "Bookings",
        data: z.array(bookingResponseSchema),
        query: listBookingsQuerySchema,
        errors: ["422"],
      }),
      post: operation({
        summary: "Create an admin booking",
        tag: "Bookings",
        data: bookingResponseSchema,
        status: "201",
        body: createBookingSchema,
        errors: ["404", "409", "422"],
      }),
    },
    "/api/bookings/{id}": {
      get: operation({
        summary: "Get a booking",
        tag: "Bookings",
        data: bookingResponseSchema,
        hasId: true,
        errors: ["404"],
      }),
      patch: operation({
        summary: "Reschedule or annotate a booking",
        tag: "Bookings",
        data: bookingResponseSchema,
        hasId: true,
        body: updateBookingSchema,
        errors: ["404", "409", "422"],
      }),
    },
    "/api/bookings/{id}/confirmation": {
      post: operation({
        summary: "Confirm a pending or expired booking",
        tag: "Bookings",
        data: bookingResponseSchema,
        hasId: true,
        errors: ["404", "409"],
      }),
    },
    "/api/bookings/{id}/cancellation": {
      post: operation({
        summary: "Cancel a booking",
        tag: "Bookings",
        data: bookingResponseSchema,
        hasId: true,
        errors: ["404", "409"],
      }),
    },
    "/api/bookings/{id}/completion": {
      post: operation({
        summary: "Mark a confirmed booking completed or no-show",
        tag: "Bookings",
        data: bookingResponseSchema,
        hasId: true,
        body: completeBookingSchema,
        errors: ["404", "409", "422"],
      }),
    },
    "/api/bookings/{id}/payment": {
      post: operation({
        summary: "Record payment, optionally creating the linked sale",
        tag: "Bookings",
        data: bookingPaymentResponseSchema,
        hasId: true,
        body: recordBookingPaymentSchema,
        errors: ["404", "409", "422"],
      }),
    },
    "/api/calendar": {
      get: operation({
        summary: "List calendar bookings with customer and court names",
        tag: "Calendar",
        data: z.array(calendarEntrySchema),
        query: calendarQuerySchema,
        errors: ["422"],
      }),
    },
    "/api/customers": {
      get: operation({
        summary: "List customers",
        tag: "Customers",
        data: z.array(customerResponseSchema),
        query: listCustomersQuerySchema,
        errors: ["422"],
      }),
      post: operation({
        summary: "Create a customer",
        tag: "Customers",
        data: customerResponseSchema,
        status: "201",
        body: createCustomerRequestSchema,
        errors: ["409", "422"],
      }),
    },
    "/api/customers/{id}": {
      get: operation({
        summary: "Get a customer",
        tag: "Customers",
        data: customerResponseSchema,
        hasId: true,
        errors: ["404"],
      }),
      patch: operation({
        summary: "Update a customer",
        tag: "Customers",
        data: customerResponseSchema,
        hasId: true,
        body: updateCustomerSchema,
        errors: ["404", "422"],
      }),
    },
    "/api/customers/{id}/bookings": {
      get: operation({
        summary: "List a customer's bookings",
        tag: "Customers",
        data: z.array(bookingResponseSchema),
        hasId: true,
        errors: ["404"],
      }),
    },
    "/api/customers/{id}/sales": {
      get: operation({
        summary: "List a customer's sales",
        tag: "Customers",
        data: z.array(saleResponseSchema),
        hasId: true,
        errors: ["404"],
      }),
    },
    "/api/recurring-bookings": {
      get: operation({
        summary: "List recurring booking templates with customer and court names",
        tag: "Recurring Bookings",
        data: z.array(recurringBookingWithNamesSchema),
      }),
      post: operation({
        summary: "Create a recurring booking template",
        tag: "Recurring Bookings",
        data: recurringBookingResponseSchema,
        status: "201",
        body: createRecurringBookingSchema,
        errors: ["404", "422"],
      }),
    },
    "/api/recurring-bookings/{id}": {
      get: operation({
        summary: "Get a recurring booking template",
        tag: "Recurring Bookings",
        data: recurringBookingWithNamesSchema,
        hasId: true,
        errors: ["404"],
      }),
      patch: operation({
        summary: "Update a recurring booking template",
        tag: "Recurring Bookings",
        data: recurringBookingResponseSchema,
        hasId: true,
        body: updateRecurringBookingSchema,
        errors: ["404", "422"],
      }),
    },
    "/api/sales": {
      get: operation({
        summary: "List sales",
        tag: "Sales",
        data: z.array(saleResponseSchema),
        query: listSalesQuerySchema,
        errors: ["422"],
      }),
      post: operation({
        summary: "Record a sale",
        tag: "Sales",
        data: saleResponseSchema,
        status: "201",
        body: createSaleSchema,
        errors: ["404", "422"],
      }),
    },
    "/api/sales/{id}": {
      get: operation({
        summary: "Get a sale",
        tag: "Sales",
        data: saleResponseSchema,
        hasId: true,
        errors: ["404"],
      }),
      patch: operation({
        summary: "Update an unvoided sale",
        tag: "Sales",
        data: saleResponseSchema,
        hasId: true,
        body: updateSaleSchema,
        errors: ["404", "409", "422"],
      }),
    },
    "/api/sales/{id}/void": {
      post: operation({
        summary: "Void a sale (owner_admin only)",
        tag: "Sales",
        data: saleResponseSchema,
        hasId: true,
        body: voidSaleSchema,
        errors: ["403", "404", "409", "422"],
      }),
    },
    "/api/me": {
      get: operation({
        summary: "Get the acting staff member",
        tag: "Staff",
        data: staffResponseSchema,
      }),
    },
    "/api/staff": {
      get: operation({
        summary: "List staff (owner_admin only)",
        tag: "Staff",
        data: z.array(staffResponseSchema),
        errors: ["403"],
      }),
      post: operation({
        summary: "Invite a staff member (owner_admin only)",
        tag: "Staff",
        data: staffResponseSchema,
        status: "201",
        body: inviteStaffSchema,
        errors: ["403", "409", "422"],
      }),
    },
    "/api/staff/{id}": {
      get: operation({
        summary: "Get a staff member (owner_admin only)",
        tag: "Staff",
        data: staffResponseSchema,
        hasId: true,
        errors: ["403", "404"],
      }),
      patch: operation({
        summary: "Update a staff member (owner_admin only)",
        tag: "Staff",
        data: staffResponseSchema,
        hasId: true,
        body: updateStaffSchema,
        errors: ["403", "404", "409", "422"],
      }),
    },
    "/api/staff/{id}/disablement": {
      post: operation({
        summary: "Disable a staff member (owner_admin only)",
        tag: "Staff",
        data: staffResponseSchema,
        hasId: true,
        errors: ["403", "404", "409"],
      }),
    },
    "/api/staff/{id}/reinstatement": {
      post: operation({
        summary: "Reinstate a disabled staff member (owner_admin only)",
        tag: "Staff",
        data: staffResponseSchema,
        hasId: true,
        errors: ["403", "404", "409"],
      }),
    },
  },
});
