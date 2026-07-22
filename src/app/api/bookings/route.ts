import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { bookingService } from "@/services/booking.service";
import { createBookingSchema, listBookingsQuerySchema } from "@/validators/booking.validator";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const query = listBookingsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return apiSuccess(await bookingService.list(query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const input = createBookingSchema.parse(await request.json());
    return apiSuccess(await bookingService.create(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
