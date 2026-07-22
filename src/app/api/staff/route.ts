import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { staffService } from "@/services/staff.service";
import { inviteStaffSchema } from "@/validators/staff.validator";

export async function GET() {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);
    if (staff.role !== "owner_admin") return apiError("Forbidden", 403);

    return apiSuccess(await staffService.list());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);
    if (staff.role !== "owner_admin") return apiError("Forbidden", 403);

    const input = inviteStaffSchema.parse(await request.json());
    return apiSuccess(await staffService.create(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
