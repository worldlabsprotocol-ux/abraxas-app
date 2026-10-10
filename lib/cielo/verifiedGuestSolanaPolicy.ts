// FILE: lib/cielo/verifiedGuestSolanaPolicy.ts
// cielo-verified-guest-solana-v1 — same pilot semantics, Solana wallet binding.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { getPolicy } from "@/lib/verification/requestsService";
import { CIELO_PARTNER_ID, CIELO_RECORD_ID } from "@/lib/cielo/cieloIds";
import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";
import type { CieloVerifiedGuestEvaluation, CieloEligibilityDecision } from "@/lib/cielo/verifiedGuestPolicy";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const WALLET_FRESH_HOURS = 720;

function sb(): SupabaseClient | null {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

function displayDecision(decision: CieloEligibilityDecision): CieloVerifiedGuestEvaluation["display_decision"] {
  if (decision === "approved") return "APPROVED";
  if (decision === "manual_review") return "MANUAL REVIEW";
  return "NOT ELIGIBLE";
}

async function hasHolderAccount(client: SupabaseClient, holderAccountId: string): Promise<boolean> {
  const { data } = await client
    .from("holder_accounts")
    .select("id")
    .eq("id", holderAccountId)
    .maybeSingle();
  return Boolean(data);
}

async function hasCompleteProfile(client: SupabaseClient, claimsSubjectKey: string): Promise<boolean> {
  const { data } = await client
    .from("user_profiles")
    .select("username, display_name")
    .eq("wallet_address", claimsSubjectKey)
    .maybeSingle();
  if (!data) return false;
  return Boolean(data.username?.trim() || data.display_name?.trim());
}

async function getSolanaWalletBinding(
  client: SupabaseClient,
  claimsSubjectKey: string,
  solanaAddress: string,
): Promise<{ id: string; fresh: boolean; active: boolean } | null> {
  const { data } = await client
    .from("wallet_bindings")
    .select("id, binding_method, verified_at, revoked_at, chain")
    .eq("subject_id", claimsSubjectKey)
    .eq("wallet_address", solanaAddress)
    .eq("chain", "solana")
    .is("revoked_at", null)
    .maybeSingle();

  if (!data || data.binding_method !== "signed_challenge") return null;
  const verifiedAt = new Date(data.verified_at as string).getTime();
  const fresh = Date.now() - verifiedAt <= WALLET_FRESH_HOURS * 60 * 60 * 1000;
  return { id: data.id as string, fresh, active: true };
}

export async function evaluateCieloVerifiedGuestSolana(input: {
  holderAccountId: string;
  claimsSubjectKey: string;
  solanaAddress: string;
  requireConsent?: boolean;
}): Promise<CieloVerifiedGuestEvaluation> {
  const policy = await getPolicy(CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID);
  const policyVersion = policy?.version ?? 1;
  const client = sb();

  if (!client || !policy) {
    return {
      decision: "manual_review",
      display_decision: "MANUAL REVIEW",
      policy_id: CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID,
      policy_version: policyVersion,
      reason_codes: ["policy_unavailable"],
      account_active: false,
      profile_complete: false,
      wallet_binding_active: false,
      wallet_binding_fresh: false,
      consent_active: false,
      identity_credential_active: false,
      wallet_binding_id: null,
      missing_steps: ["Policy unavailable"],
    };
  }

  const accountActive = await hasHolderAccount(client, input.holderAccountId);
  const profileComplete = await hasCompleteProfile(client, input.claimsSubjectKey);
  const binding = await getSolanaWalletBinding(client, input.claimsSubjectKey, input.solanaAddress);

  let consentActive = false;
  if (input.requireConsent !== false) {
    const { data } = await client
      .from("consent_receipts")
      .select("id, expires_at, revoked_at")
      .eq("subject_id", input.claimsSubjectKey)
      .eq("partner_id", CIELO_PARTNER_ID)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data && (!data.expires_at || new Date(data.expires_at as string) >= new Date())) {
      consentActive = true;
    }
  } else {
    consentActive = true;
  }

  const missing: string[] = [];
  if (!accountActive) missing.push("missing:account");
  if (!profileComplete) missing.push("missing:profile");
  if (!binding?.active) missing.push("missing:wallet_binding");
  else if (!binding.fresh) missing.push("stale:wallet_binding");

  let decision: CieloEligibilityDecision = "approved";
  if (!accountActive || !profileComplete || !binding?.active) {
    decision = "not_eligible";
  } else if (!binding.fresh) {
    decision = "manual_review";
  } else if (input.requireConsent !== false && !consentActive) {
    decision = "not_eligible";
    missing.push("missing:consent");
  }

  return {
    decision,
    display_decision: displayDecision(decision),
    policy_id: CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID,
    policy_version: policyVersion,
    reason_codes: missing,
    account_active: accountActive,
    profile_complete: profileComplete,
    wallet_binding_active: Boolean(binding?.active),
    wallet_binding_fresh: Boolean(binding?.fresh),
    consent_active: consentActive,
    identity_credential_active: false,
    wallet_binding_id: binding?.id ?? null,
    missing_steps: missing.map(m => m.replace(/^missing:|^stale:/, "")),
  };
}

export { CIELO_RECORD_ID, CIELO_PARTNER_ID };
