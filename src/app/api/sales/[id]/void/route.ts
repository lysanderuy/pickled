import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { saleService } from "@/services/sale.service";
import { voidSaleSchema } from "@/validators/sale.validator";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);
    if (staff.role !== "owner_admin") return apiError("Forbidden", 403);

    const { id } = await params;
    // All body fields are optional — tolerate an empty body.
    const input = voidSaleSchema.parse(await request.json().catch(() => ({})));
    return apiSuccess(await saleService.void(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
