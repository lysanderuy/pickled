import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { profileService } from "@/services/profile.service";
import { updateProfileSchema } from "@/validators/profile.validator";

// Example route handler — replace/extend per project.

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("Unauthorized", 401);

    const profile = await profileService.getById(user.id);
    if (!profile) return apiError("Profile not found", 404);

    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("Unauthorized", 401);

    const body = await request.json();
    const input = updateProfileSchema.parse(body);

    const profile = await profileService.update(user.id, input);
    if (!profile) return apiError("Profile not found", 404);

    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
