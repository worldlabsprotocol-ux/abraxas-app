// FILE: lib/policy/assertPolicyOwnership.ts
// Tenancy guard — policy must belong to the relying party.

import { GOOD_TROUBLE_BROWSE_POLICY_ID } from "@/lib/goodTrouble/constants";
import { isGoodTroubleBrowsePartnerId } from "@/lib/partner/goodTroubleBrowseFlow";
import type { PartnerPolicy } from "@/lib/policy/types";

export class PolicyOwnershipError extends Error {
  constructor(message = "Policy does not belong to partner") {
    super(message);
    this.name = "PolicyOwnershipError";
  }
}

export function policyOwnedByPartner(policy: PartnerPolicy, partnerId: string): boolean {
  if (policy.partner_id === partnerId) return true;

  return (
    policy.id === GOOD_TROUBLE_BROWSE_POLICY_ID
    && isGoodTroubleBrowsePartnerId(partnerId)
    && isGoodTroubleBrowsePartnerId(policy.partner_id)
  );
}

export function assertPolicyBelongsToPartner(policy: PartnerPolicy, partnerId: string): void {
  if (!policyOwnedByPartner(policy, partnerId)) {
    throw new PolicyOwnershipError();
  }
}
