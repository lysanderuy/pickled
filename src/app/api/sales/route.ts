import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { saleService } from "@/services/sale.service";
import { createSaleSchema, listSalesQuerySchema } from "@/validators/sale.validator";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const query = listSalesQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return apiSuccess(await saleService.list(query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const input = createSaleSchema.parse(await request.json());
    return apiSuccess(await saleService.create(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
