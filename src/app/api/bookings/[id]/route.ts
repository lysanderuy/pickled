import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { bookingService } from "@/services/booking.service";
import { updateBookingSchema } from "@/validators/booking.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    return apiSuccess(await bookingService.getById(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    const input = updateBookingSchema.parse(await request.json());
    return apiSuccess(await bookingService.update(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
