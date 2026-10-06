// FILE: lib/partner/integrationKit/policyCapabilities.ts
// Capability-driven integration options derived from policy packs — no policy-specific SDK forks.

import {
  inferPolicyPackFromPolicyId,
  resolvePolicyPack,
  type IntegrationPackId,
  type IntegrationPolicyPack,
} from "./policy/packInference.js";

export interface PolicyIntegrationCapabilities {
  packId: IntegrationPackId | null;
  resultFamily: string | null;
  /** When true, createVerificationRequest requires expectedContentHash (or expectedArtifactBinding). */
  requiresExpectedContentHash: boolean;
  /** Human-readable integration hint for docs and validation errors. */
  bindingHint: string | null;
}

function capabilitiesFromPack(pack: IntegrationPolicyPack | null): PolicyIntegrationCapabilities {
  if (!pack) {
    return {
      packId: null,
      resultFamily: null,
      requiresExpectedContentHash: false,
      bindingHint: null,
    };
  }
  const requiresExpectedContentHash = pack.required_claims.includes("source_integrity_verified");
  return {
    packId: pack.id,
    resultFamily: pack.disclosed_result,
    requiresExpectedContentHash,
    bindingHint: requiresExpectedContentHash
      ? "Provide expectedContentHash (SHA-256 hex of exact artifact bytes) before launching Hosted Partner Flow."
      : null,
  };
}

export function resolvePolicyIntegrationCapabilities(input: {
  policyPackId?: string | null;
  policyId?: string | null;
}): PolicyIntegrationCapabilities {
  const fromPackId = input.policyPackId ? resolvePolicyPack(input.policyPackId) : null;
  if (fromPackId) return capabilitiesFromPack(fromPackId);
  const inferred = input.policyId ? inferPolicyPackFromPolicyId(input.policyId) : null;
  return capabilitiesFromPack(inferred);
}

export function validateVerificationRequestCapabilities(
  capabilities: PolicyIntegrationCapabilities,
  input: { expectedContentHash?: string | null },
): { ok: true } | { ok: false; errors: string[]; category: "invalid_request" } {
  if (!capabilities.requiresExpectedContentHash) {
    return { ok: true };
  }
  const hash = input.expectedContentHash?.trim().toLowerCase() ?? "";
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    return {
      ok: false,
      category: "invalid_request",
      errors: ["expected_content_hash_required"],
    };
  }
  return { ok: true };
}
