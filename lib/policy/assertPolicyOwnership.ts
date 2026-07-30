// FILE: lib/policy/assertPolicyOwnership.ts
// Tenancy guard — policy must belong to the relying party.

import type { PartnerPolicy } from "@/lib/policy/types";

export class PolicyOwnershipError extends Error {
  constructor(message = "Policy does not belong to partner") {
    super(message);
    this.name = "PolicyOwnershipError";
  }
}

export function assertPolicyBelongsToPartner(policy: PartnerPolicy, partnerId: string): void {
  if (policy.partner_id !== partnerId) {
    throw new PolicyOwnershipError();
  }
}
