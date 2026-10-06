export type IntegrationPackId =
  | "age_18_retail"
  | "age_21_retail"
  | "residency_us"
  | "wallet_control"
  | "membership_credential"
  | "collector_redemption"
  | "identity_liveness"
  | "sandbox_economic_demo"
  | "sandbox_institutional_protocol_access"
  | "content_origin_disclosure"
  | "content_ai_disclosure"
  | "content_source_integrity";

export interface IntegrationPolicyPack {
  id: IntegrationPackId;
  disclosed_result: string;
  required_claims: readonly string[];
}

/** Integration-relevant pack metadata — kept in sync with lib/partner/launchpad/policyPacks.ts via drift test. */
export const INTEGRATION_POLICY_PACKS: readonly IntegrationPolicyPack[] = [
  { id: "age_18_retail", disclosed_result: "age_eligible_18", required_claims: ["identity_verified"] },
  { id: "age_21_retail", disclosed_result: "age_eligible_21", required_claims: ["identity_verified"] },
  { id: "residency_us", disclosed_result: "residency_check_passed", required_claims: ["residency_country"] },
  { id: "wallet_control", disclosed_result: "wallet_control_confirmed", required_claims: ["wallet_binding_confirmed"] },
  { id: "membership_credential", disclosed_result: "credential_active", required_claims: ["identity_verified"] },
  { id: "collector_redemption", disclosed_result: "redemption_eligible", required_claims: ["product_eligibility"] },
  { id: "identity_liveness", disclosed_result: "identity_and_liveness_met", required_claims: ["identity_verified", "liveness_passed"] },
  { id: "sandbox_economic_demo", disclosed_result: "sandbox_demo_eligible", required_claims: ["product_eligibility"] },
  { id: "sandbox_institutional_protocol_access", disclosed_result: "organization_eligible", required_claims: [] },
  { id: "content_origin_disclosure", disclosed_result: "content_origin_disclosed", required_claims: ["creator_attested", "ai_assistance_disclosed", "source_integrity_verified"] },
  { id: "content_ai_disclosure", disclosed_result: "ai_assistance_disclosed", required_claims: ["ai_assistance_disclosed"] },
  { id: "content_source_integrity", disclosed_result: "source_integrity_verified", required_claims: ["source_integrity_verified"] },
] as const;

export function resolvePolicyPack(packId: string): IntegrationPolicyPack | null {
  return INTEGRATION_POLICY_PACKS.find((pack) => pack.id === packId) ?? null;
}

export function inferPolicyPackFromPolicyId(policyId: string): IntegrationPolicyPack | null {
  const trimmed = policyId.trim();
  const direct = resolvePolicyPack(trimmed);
  if (direct) return direct;
  const packs = [...INTEGRATION_POLICY_PACKS].sort((a, b) => b.id.length - a.id.length);
  for (const pack of packs) {
    if (trimmed.includes(pack.id)) return pack;
  }
  if (/\bretail-v\d/i.test(trimmed)) {
    return resolvePolicyPack("age_21_retail");
  }
  return null;
}
