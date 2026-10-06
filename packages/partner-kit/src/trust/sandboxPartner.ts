export const SANDBOX_PARTNER_ID = "abraxas-partner-sandbox";
export const SANDBOX_POLICY_ID = "partner-sandbox-gate-v1";
export const LEGACY_SANDBOX_POLICY_ID = "meridian-investor-gate-v1";
export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID = "sandbox_institutional_protocol_access-v1";

export function isSandboxPolicyId(policyId: string): boolean {
  const trimmed = policyId.trim();
  return trimmed === SANDBOX_POLICY_ID
    || trimmed === LEGACY_SANDBOX_POLICY_ID
    || trimmed === SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;
}
