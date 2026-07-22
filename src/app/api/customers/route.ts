import { z } from "zod";

import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { customerService } from "@/services/customer.service";
import { createCustomerSchema, listCustomersQuerySchema } from "@/validators/customer.validator";

const createCustomerRequestSchema = createCustomerSchema.extend({
  allowDuplicate: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const query = listCustomersQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return apiSuccess(await customerService.list(query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { allowDuplicate, ...input } = createCustomerRequestSchema.parse(await request.json());
    return apiSuccess(await customerService.create(input, { allowDuplicate }), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
