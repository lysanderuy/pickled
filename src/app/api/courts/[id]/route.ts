import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { courtService } from "@/services/court.service";
import { updateCourtSchema } from "@/validators/court.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    return apiSuccess(await courtService.getById(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    const input = updateCourtSchema.parse(await request.json());
    return apiSuccess(await courtService.update(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    await courtService.remove(id);
    return apiSuccess(null);
  } catch (error) {
    return handleApiError(error);
  }
}
