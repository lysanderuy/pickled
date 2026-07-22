import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";

export async function GET() {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    return apiSuccess(staff);
  } catch (error) {
    return handleApiError(error);
  }
}
