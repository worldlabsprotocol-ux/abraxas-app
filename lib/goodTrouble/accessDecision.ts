// FILE: lib/goodTrouble/accessDecision.ts
// Good Trouble reference partner: server decision via canonical sandbox verification.

import type { PartnerKitSafeResult } from "@/lib/partner/integrationKit";
import { verifyGoodTroubleSandboxAccess } from "@/lib/goodTrouble/sandboxPartnerVerification";

export async function decideGoodTroubleAccess(
  search: URLSearchParams | Record<string, string | string[] | undefined>,
  fetchFn?: typeof fetch,
): Promise<PartnerKitSafeResult & { grant: boolean }> {
  const result = await verifyGoodTroubleSandboxAccess({ search, fetchFn });
  return { ...result.verification, grant: result.grant };
}
