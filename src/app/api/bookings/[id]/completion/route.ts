import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { bookingService } from "@/services/booking.service";
import { completeBookingSchema } from "@/validators/booking.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    const input = completeBookingSchema.parse(await request.json());
    return apiSuccess(await bookingService.complete(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
