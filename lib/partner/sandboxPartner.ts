// FILE: lib/partner/sandboxPartner.ts
// Canonical IDs for the internal Abraxas Partner Sandbox (not an external org).

export const SANDBOX_PARTNER_ID = "abraxas-partner-sandbox";
export const SANDBOX_POLICY_ID = "partner-sandbox-gate-v1";

/** @deprecated Legacy demo IDs — removed from code; migration 030 renames in DB. */
export const LEGACY_SANDBOX_PARTNER_ID = "meridian-private-credit";
export const LEGACY_SANDBOX_POLICY_ID = "meridian-investor-gate-v1";

export function isSandboxPolicyId(policyId: string): boolean {
  return policyId === SANDBOX_POLICY_ID || policyId === LEGACY_SANDBOX_POLICY_ID;
}

export function sandboxPartnerIdForPolicy(policyId: string): string {
  return isSandboxPolicyId(policyId) ? SANDBOX_PARTNER_ID : "abraxas-pilot";
}
