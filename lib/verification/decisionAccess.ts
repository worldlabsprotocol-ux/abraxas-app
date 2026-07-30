// FILE: lib/verification/decisionAccess.ts
// Partner-scoped decision access — prevents cross-tenant IDOR.

import type { PolicyDecisionRecord } from "@/lib/policy/types";
import { getDecisionStatus } from "@/lib/verification/requestsService";

export async function getDecisionStatusForPartner(
  decisionId: string,
  partnerId: string,
): Promise<PolicyDecisionRecord | null> {
  const decision = await getDecisionStatus(decisionId);
  if (!decision) return null;
  if (decision.partner_id !== partnerId) return null;
  return decision;
}
