// FILE: lib/goodTrouble/solanaAge21RetailPolicy.ts
// good-trouble-age_21_retail-solana-v1 — L2 identity path for Phantom holders.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { getPolicy } from "@/lib/verification/requestsService";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";
import { GOOD_TROUBLE_CANONICAL_RESULT_FAMILY } from "@/lib/goodTrouble/canonicalProductionConfig";
import { policyRequiresIdentityEvidenceForPurchase } from "@/lib/goodTrouble/pilotAgeEligibilityPolicy";
import type { PartnerPolicyRules } from "@/lib/policy/types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function sb(): SupabaseClient | null {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

export type GoodTroubleSolanaAgeEvaluation = {
  decision: "approved" | "denied" | "manual_review";
  policy_id: typeof GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID;
  policy_version: number;
  disclosed_result: typeof GOOD_TROUBLE_CANONICAL_RESULT_FAMILY;
  reason_codes: string[];
  identity_required: true;
};

export async function evaluateGoodTroubleSolanaAge21(input: {
  claimsSubjectKey: string;
  holderAccountId: string;
}): Promise<GoodTroubleSolanaAgeEvaluation> {
  const policy = await getPolicy(GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID);
  const policyVersion = policy?.version ?? 1;
  const base: GoodTroubleSolanaAgeEvaluation = {
    decision: "manual_review",
    policy_id: GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID,
    policy_version: policyVersion,
    disclosed_result: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
    reason_codes: [],
    identity_required: true,
  };

  if (!policy?.rules_json) {
    base.reason_codes.push("policy_unavailable");
    return base;
  }

  const rules = policy.rules_json as PartnerPolicyRules;
  if (!policyRequiresIdentityEvidenceForPurchase(rules)) {
    base.reason_codes.push("policy_misconfigured");
    base.decision = "denied";
    return base;
  }

  const client = sb();
  if (!client) {
    base.reason_codes.push("persistence_unavailable");
    return base;
  }

  const { data: account } = await client
    .from("holder_accounts")
    .select("id")
    .eq("id", input.holderAccountId)
    .maybeSingle();
  if (!account) {
    base.reason_codes.push("holder_account_missing");
    base.decision = "denied";
    return base;
  }

  const { data: idv } = await client
    .from("identity_verifications")
    .select("status, identity_verification_status, credential_status, credential_jti")
    .or(`wallet_address.eq.${input.claimsSubjectKey},sui_address.eq.${input.claimsSubjectKey}`)
    .maybeSingle();

  const approved =
    idv?.status === "approved"
    || idv?.identity_verification_status === "approved";
  const credActive =
    idv?.credential_status === "active"
    || Boolean(idv?.credential_jti);

  if (!approved || !credActive) {
    base.reason_codes.push("qualified_identity_evidence_missing");
    base.decision = "denied";
    return base;
  }

  const { data: identityClaim } = await client
    .from("credential_claims")
    .select("id, assurance_level, expires_at, status")
    .eq("subject_id", input.claimsSubjectKey)
    .eq("claim_type", "identity_verified")
    .eq("status", "active")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!identityClaim) {
    base.reason_codes.push("identity_claim_missing");
    base.decision = "denied";
    return base;
  }

  const assurance = (identityClaim.assurance_level as string | null)?.toUpperCase() ?? "";
  if (assurance !== "L2" && assurance !== "L3") {
    base.reason_codes.push("insufficient_assurance");
    base.decision = "denied";
    return base;
  }

  if (identityClaim.expires_at && new Date(identityClaim.expires_at as string) < new Date()) {
    base.reason_codes.push("identity_evidence_stale");
    base.decision = "denied";
    return base;
  }

  base.decision = "approved";
  base.reason_codes.push("qualified_age_evidence_present");
  return base;
}
