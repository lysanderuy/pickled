import { z } from "zod";

import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { bookingService } from "@/services/booking.service";

const calendarQuerySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  courtId: z.uuid().optional(),
});

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const query = calendarQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return apiSuccess(await bookingService.calendar(query));
  } catch (error) {
    return handleApiError(error);
  }
}
