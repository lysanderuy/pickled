import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { recurringBookingService } from "@/services/recurring-booking.service";
import { createRecurringBookingSchema } from "@/validators/recurring-booking.validator";

export async function GET() {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    return apiSuccess(await recurringBookingService.list());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const input = createRecurringBookingSchema.parse(await request.json());
    return apiSuccess(await recurringBookingService.create(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
