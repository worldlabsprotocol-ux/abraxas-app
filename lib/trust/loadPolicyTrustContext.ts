// FILE: lib/trust/loadPolicyTrustContext.ts
// Load partner issuer trust rules for policy evaluation.

import type { AssuranceLevel } from "@/lib/credentials/claimSchema";
import type { PolicyEvaluationContext } from "@/lib/policy/types";
import { getTrustRulesForPolicy } from "@/lib/trust/issuerFramework";

export async function loadPolicyTrustContext(input: {
  partnerId: string;
  policyId: string;
  jurisdiction?: string | null;
}): Promise<PolicyEvaluationContext> {
  const rules = await getTrustRulesForPolicy(input.partnerId, input.policyId);
  const trustRulesByClaimType = new Map<string, {
    accepted_issuer_ids: string[];
    minimum_assurance_level?: AssuranceLevel | null;
    accepted_jurisdictions?: string[];
    credential_max_age_hours?: number | null;
  }>();

  for (const rule of rules) {
    trustRulesByClaimType.set(rule.claim_type, {
      accepted_issuer_ids: rule.accepted_issuer_ids,
      minimum_assurance_level: rule.minimum_assurance_level,
      accepted_jurisdictions: rule.accepted_jurisdictions,
      credential_max_age_hours: rule.credential_max_age_hours,
    });
  }

  return {
    partnerId: input.partnerId,
    policyId: input.policyId,
    jurisdiction: input.jurisdiction,
    trustRulesByClaimType,
  };
}
