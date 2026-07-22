import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { rateRuleService } from "@/services/rate-rule.service";
import { createRateRuleSchema, listRateRulesQuerySchema } from "@/validators/rate-rule.validator";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const query = listRateRulesQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return apiSuccess(await rateRuleService.list(query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const input = createRateRuleSchema.parse(await request.json());
    return apiSuccess(await rateRuleService.create(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
