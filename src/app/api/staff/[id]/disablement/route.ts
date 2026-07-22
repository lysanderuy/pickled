import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { staffService } from "@/services/staff.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);
    if (staff.role !== "owner_admin") return apiError("Forbidden", 403);

    const { id } = await params;
    return apiSuccess(await staffService.disable(id));
  } catch (error) {
    return handleApiError(error);
  }
}
