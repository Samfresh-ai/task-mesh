import type { NextRequest } from "next/server";

import { env } from "@/server/config/env";

export function isAuthorizedJobRequest(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return true;
  }

  const secret =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret");

  return secret === env.CRON_SECRET;
}
