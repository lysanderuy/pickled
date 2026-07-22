import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { staffService } from "@/services/staff.service";
import { updateStaffSchema } from "@/validators/staff.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);
    if (staff.role !== "owner_admin") return apiError("Forbidden", 403);

    const { id } = await params;
    return apiSuccess(await staffService.getById(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);
    if (staff.role !== "owner_admin") return apiError("Forbidden", 403);

    const { id } = await params;
    const input = updateStaffSchema.parse(await request.json());
    return apiSuccess(await staffService.update(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
