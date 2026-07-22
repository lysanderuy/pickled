import { z } from "zod";

import { requireStaff } from "@/lib/api/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { rateRuleService } from "@/services/rate-rule.service";
import { timeStringSchema } from "@/validators/facility.validator";

const ratePreviewQuerySchema = z.object({
  courtId: z.uuid(),
  date: z.iso.date(),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
});

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) return apiError("Unauthorized", 401);

    const query = ratePreviewQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return apiSuccess(
      await rateRuleService.ratePreview(query.courtId, query.date, query.startTime, query.endTime),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
