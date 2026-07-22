import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { bookingService } from "@/services/booking.service";
import { recordBookingPaymentSchema } from "@/validators/booking.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    const input = recordBookingPaymentSchema.parse(await request.json());
    return apiSuccess(await bookingService.recordPayment(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
