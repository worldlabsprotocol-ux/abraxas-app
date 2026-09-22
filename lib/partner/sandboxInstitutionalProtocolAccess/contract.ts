/** Reviewed sandbox-only institutional protocol-access policy. Not live KYB. */

export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID =
  "sandbox_institutional_protocol_access" as const;
export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION = 1 as const;
export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION = "activate_protocol_access" as const;
export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE = "sandbox:protocol_access" as const;
export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ISSUER = "abraxas.organization_eligibility" as const;
export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT = "organization_eligible" as const;
export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ASSURANCE = "L2" as const;

export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE =
  "Technical sandbox policy only. It is not live KYB, KYC, AML/KYT, legal certification, production access, Utila integration, or permission to move funds.";

export const SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SEQUENCE = [
  "Create sandbox app",
  "Configure Partner Flow",
  "Complete sandbox institutional eligibility",
  "Create V2 devnet plan",
  "Human deploy",
  "Verify",
  "Register",
] as const;

export function isSandboxInstitutionalProtocolAccessPolicyId(policyId: string): boolean {
  return policyId.trim() === SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;
}

export function pinSandboxInstitutionalProtocolAccessPolicyId(
  templateId: string,
  partnerScopedId: string,
): string {
  return templateId === SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID
    ? SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID
    : partnerScopedId;
}

export function sandboxInstitutionalProtocolAccessProductionDenied(
  environment: string,
  policyId?: string,
): boolean {
  if (environment === "production") {
    if (!policyId) return true;
    return isSandboxInstitutionalProtocolAccessPolicyId(policyId);
  }
  return false;
}
