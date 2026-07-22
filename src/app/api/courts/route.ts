import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { courtService } from "@/services/court.service";
import { createCourtSchema } from "@/validators/court.validator";

export async function GET() {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    return apiSuccess(await courtService.list());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const input = createCourtSchema.parse(await request.json());
    return apiSuccess(await courtService.create(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
