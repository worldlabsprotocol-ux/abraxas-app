// FILE: lib/institutional/mandate/enforcementPolicy.ts
// Build 886 — trusted application enforcement policy (not caller-supplied flags).

export type InstitutionalEnforcementMode = "mandate_only" | "mandate_and_abraxas_receipt";

/**
 * Loaded from relying-party trusted configuration (env, file, or internal registry).
 * Must not be derived from unauthenticated HTTP request fields.
 */
export type TrustedInstitutionalEnforcementPolicy = {
  mode: InstitutionalEnforcementMode;
  policy_id: string;
  policy_version: number;
  tenant_id: string;
  environment: "demo" | "production";
};

export function assertTrustedPolicyMatchesMandate(input: {
  trustedPolicy: TrustedInstitutionalEnforcementPolicy;
  mandatePolicyId: string;
  mandatePolicyVersion: number;
  mandateTenantId: string;
  mandateEnvironment: "demo" | "production";
}): { ok: true } | { ok: false; reason: string; trust_boundary: string } {
  if (input.trustedPolicy.policy_id !== input.mandatePolicyId) {
    return {
      ok: false,
      reason: "trusted_policy_id_mismatch",
      trust_boundary: "trusted_application_policy",
    };
  }
  if (input.trustedPolicy.policy_version !== input.mandatePolicyVersion) {
    return {
      ok: false,
      reason: "trusted_policy_version_mismatch",
      trust_boundary: "trusted_application_policy",
    };
  }
  if (input.trustedPolicy.tenant_id !== input.mandateTenantId) {
    return {
      ok: false,
      reason: "trusted_tenant_mismatch",
      trust_boundary: "trusted_application_policy",
    };
  }
  if (input.trustedPolicy.environment !== input.mandateEnvironment) {
    return {
      ok: false,
      reason: "trusted_environment_mismatch",
      trust_boundary: "trusted_application_policy",
    };
  }
  return { ok: true };
}
