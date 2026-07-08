// FILE: lib/cielo/verifiedGuestPolicy.ts
// Server-side evaluation for cielo-verified-guest-v1 (Passport + wallet + consent; ID optional).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { getPolicy } from "@/lib/verification/requestsService";
import { getVerifiedRateFixture, type VerifiedRateFixture } from "@/lib/cielo/verifiedRateFixtures";

export const CIELO_VERIFIED_GUEST_POLICY_ID = "cielo-verified-guest-v1";
export const CIELO_RECORD_ID = "ABX-RE-HOSP-001";
export const CIELO_PARTNER_ID = "cielo";

export type CieloEligibilityDecision = "approved" | "manual_review" | "not_eligible";

export interface CieloVerifiedGuestEvaluation {
  decision: CieloEligibilityDecision;
  display_decision: "APPROVED" | "MANUAL REVIEW" | "NOT ELIGIBLE";
  policy_id: string;
  policy_version: number;
  reason_codes: string[];
  account_active: boolean;
  profile_complete: boolean;
  wallet_binding_active: boolean;
  wallet_binding_fresh: boolean;
  consent_active: boolean;
  identity_credential_active: boolean;
  wallet_binding_id: string | null;
  missing_steps: string[];
}

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

function fixtureToEvaluation(fixture: VerifiedRateFixture): CieloVerifiedGuestEvaluation {
  return {
    decision: fixture,
    display_decision: displayDecision(fixture),
    policy_id: CIELO_VERIFIED_GUEST_POLICY_ID,
    policy_version: 1,
    reason_codes: fixture === "approved" ? [] : [`fixture:${fixture}`],
    account_active: fixture !== "not_eligible",
    profile_complete: fixture === "approved",
    wallet_binding_active: fixture !== "not_eligible",
    wallet_binding_fresh: fixture === "approved",
    consent_active: fixture === "approved",
    identity_credential_active: false,
    wallet_binding_id: null,
    missing_steps: fixture === "approved" ? [] : ["Complete pilot fixture prerequisites"],
  };
}

async function hasActiveAccount(client: SupabaseClient, subject: string): Promise<boolean> {
  const { data } = await client
    .from("sui_zklogin_identities")
    .select("sui_address")
    .eq("sui_address", subject)
    .maybeSingle();
  return Boolean(data);
}

async function hasCompleteProfile(client: SupabaseClient, subject: string): Promise<boolean> {
  const { data } = await client
    .from("user_profiles")
    .select("username, display_name")
    .eq("wallet_address", subject)
    .maybeSingle();
  if (!data) return false;
  return Boolean(data.username?.trim() || data.display_name?.trim());
}

async function getWalletBinding(
  client: SupabaseClient,
  subject: string,
): Promise<{ id: string; fresh: boolean; active: boolean } | null> {
  const { data } = await client
    .from("wallet_bindings")
    .select("id, binding_method, verified_at, revoked_at")
    .eq("subject_id", subject)
    .eq("wallet_address", subject)
    .is("revoked_at", null)
    .maybeSingle();

  if (!data || data.binding_method !== "signed_challenge") return null;

  const verifiedAt = new Date(data.verified_at as string).getTime();
  const fresh = Date.now() - verifiedAt <= WALLET_FRESH_HOURS * 60 * 60 * 1000;

  return { id: data.id as string, fresh, active: true };
}

async function hasActiveConsent(
  client: SupabaseClient,
  subject: string,
  partnerId: string,
): Promise<boolean> {
  const { data } = await client
    .from("consent_receipts")
    .select("id, expires_at, revoked_at")
    .eq("subject_id", subject)
    .eq("partner_id", partnerId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  if (data.expires_at && new Date(data.expires_at as string) < new Date()) return false;
  return true;
}

async function hasActiveIdentityCredential(client: SupabaseClient, subject: string): Promise<boolean> {
  const { data } = await client
    .from("abraxas_credentials")
    .select("jti")
    .or(`sui_address.eq.${subject},wallet_address.eq.${subject}`)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function evaluateCieloVerifiedGuest(
  suiAddress: string,
  options?: { requireConsent?: boolean; fixture?: VerifiedRateFixture | null },
): Promise<CieloVerifiedGuestEvaluation> {
  const fixture = options?.fixture ?? getVerifiedRateFixture();
  if (fixture) return fixtureToEvaluation(fixture);

  const subject = normalizeSuiAddress(suiAddress);
  const policy = await getPolicy(CIELO_VERIFIED_GUEST_POLICY_ID);
  const policyVersion = policy?.version ?? 1;

  const client = sb();
  if (!client || !policy) {
    return {
      decision: "manual_review",
      display_decision: "MANUAL REVIEW",
      policy_id: CIELO_VERIFIED_GUEST_POLICY_ID,
      policy_version: policyVersion,
      reason_codes: ["policy_unavailable"],
      account_active: false,
      profile_complete: false,
      wallet_binding_active: false,
      wallet_binding_fresh: false,
      consent_active: false,
      identity_credential_active: false,
      wallet_binding_id: null,
      missing_steps: ["Policy service unavailable"],
    };
  }

  const [accountActive, profileComplete, walletBinding, consentActive, identityActive] = await Promise.all([
    hasActiveAccount(client, subject),
    hasCompleteProfile(client, subject),
    getWalletBinding(client, subject),
    hasActiveConsent(client, subject, CIELO_PARTNER_ID),
    hasActiveIdentityCredential(client, subject),
  ]);

  const claims = await getActiveClaims(subject);
  const claimEval = evaluatePolicyRules(policy.rules_json, claims);

  const reasonCodes: string[] = [];
  const missingSteps: string[] = [];

  if (!accountActive) {
    reasonCodes.push("missing:account");
    missingSteps.push("Sign in with Google to create your Passport account");
  }
  if (!profileComplete) {
    reasonCodes.push("missing:profile");
    missingSteps.push("Complete your public profile (username or display name)");
  }
  if (!walletBinding?.active) {
    reasonCodes.push("missing:wallet_binding");
    missingSteps.push("Bind your wallet with a fresh signature");
  } else if (!walletBinding.fresh) {
    reasonCodes.push("stale:wallet_binding");
    missingSteps.push("Re-sign wallet binding (must be within 30 days)");
  }
  if (options?.requireConsent && !consentActive) {
    reasonCodes.push("missing:consent");
    missingSteps.push("Approve consent to share required claims with Cielo");
  }

  for (const code of claimEval.reason_codes) {
    if (!reasonCodes.includes(code)) reasonCodes.push(code);
  }

  let decision: CieloEligibilityDecision = "approved";

  if (!accountActive || !walletBinding?.active) {
    decision = "not_eligible";
  } else if (!profileComplete || !walletBinding.fresh || (options?.requireConsent && !consentActive)) {
    decision = "manual_review";
  } else if (claimEval.decision === "denied") {
    decision = reasonCodes.some(c => c.startsWith("missing:")) ? "manual_review" : "not_eligible";
  } else if (claimEval.decision === "manual_review") {
    decision = "manual_review";
  }

  return {
    decision,
    display_decision: displayDecision(decision),
    policy_id: CIELO_VERIFIED_GUEST_POLICY_ID,
    policy_version: policyVersion,
    reason_codes: reasonCodes,
    account_active: accountActive,
    profile_complete: profileComplete,
    wallet_binding_active: Boolean(walletBinding?.active),
    wallet_binding_fresh: Boolean(walletBinding?.fresh),
    consent_active: consentActive,
    identity_credential_active: identityActive,
    wallet_binding_id: walletBinding?.id ?? null,
    missing_steps: missingSteps,
  };
}
