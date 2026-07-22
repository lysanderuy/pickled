import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { saleService } from "@/services/sale.service";
import { updateSaleSchema } from "@/validators/sale.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    return apiSuccess(await saleService.getById(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const { id } = await params;
    const input = updateSaleSchema.parse(await request.json());
    return apiSuccess(await saleService.update(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
