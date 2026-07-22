import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { recurringBookingService } from "@/services/recurring-booking.service";
import { updateRecurringBookingSchema } from "@/validators/recurring-booking.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    // The service exposes no getById; the single-facility template list is small.
    const template = (await recurringBookingService.list()).find((row) => row.id === id);
    if (!template) return apiError("Recurring booking not found", 404);
    return apiSuccess(template);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    const input = updateRecurringBookingSchema.parse(await request.json());
    return apiSuccess(await recurringBookingService.update(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
