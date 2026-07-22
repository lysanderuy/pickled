import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { facilityService } from "@/services/facility.service";
import { updateFacilitySchema } from "@/validators/facility.validator";

export async function GET() {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    return apiSuccess(await facilityService.get());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const input = updateFacilitySchema.parse(await request.json());
    return apiSuccess(await facilityService.update(input));
  } catch (error) {
    return handleApiError(error);
  }
}
