// FILE: lib/auth/nativeAccount/rateLimit.ts

import type { NextRequest } from "next/server";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";

export async function enforceNativeAuthRateLimit(
  req: NextRequest,
  route: string,
  limit: number,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const result = await checkLaunchpadRateLimit(req, `native-auth:${route}`, limit);
  if (!result.allowed) {
    return { allowed: false, retryAfterSec: result.retryAfterSec };
  }
  return { allowed: true };
}
