import { type NextRequest } from "next/server";

import { apiError } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  // Only /api is rate-limited — page navigations aren't the abuse surface.
  // See src/lib/rate-limit.ts for overrides.
  if (request.nextUrl.pathname.startsWith("/api")) {
    const ip = getClientIp(request);
    const result = await checkRateLimit(request.nextUrl.pathname, ip);
    if (!result.success) {
      // No analytics dashboard wired up — log so blocks are visible in
      // plain runtime/function logs (e.g. Vercel's Logs tab).
      console.warn(`[rate-limit] blocked ip=${ip} path=${request.nextUrl.pathname}`);
      const response = apiError("Too many requests", 429);
      if (result.reset) {
        response.headers.set("Retry-After", String(Math.ceil((result.reset - Date.now()) / 1000)));
      }
      return response;
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all request paths except static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
