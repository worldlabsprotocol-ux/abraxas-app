// FILE: lib/partner/trustExecution/resolveSovereignTrustExecutionForContinue.ts
// Sovereign PG hosted handoff bridge: scoped wallet trust challenge as verify_request.

import { loadScopedTrustChallenge } from "@/lib/auth/walletAuthorization/scopedChallengePostgresStore";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import { PARTNER_TRUST_EXECUTION_ACTION } from "./constants";

export function isSovereignTrustExecutionVerifyRef(value: string): boolean {
  return value.trim().startsWith("wstc_");
}

export type SovereignTrustExecutionContinuePreview = {
  verify_request: string;
  handoff_ref: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  purpose: string;
  application_id: string;
  display_label: string;
  environment: "sandbox";
  action: string;
  result_family: "trust_execution";
  expires_at: string;
  return_url: string;
  holder_path: string;
  callback_bound: true;
};

export type SovereignTrustExecutionContinueResolveResult =
  | { ok: true; preview: SovereignTrustExecutionContinuePreview }
  | { ok: false; code: "missing" | "expired" | "completed" | "unavailable" };

export async function resolveSovereignTrustExecutionForContinue(
  verifyRequest: string,
): Promise<SovereignTrustExecutionContinueResolveResult> {
  const challengeId = verifyRequest.trim();
  if (!isSovereignTrustExecutionVerifyRef(challengeId)) {
    return { ok: false, code: "missing" };
  }

  const row = await loadScopedTrustChallenge(challengeId);
  if (!row) return { ok: false, code: "missing" };
  if (new Date(row.expiresAt) <= new Date()) return { ok: false, code: "expired" };

  const origin = getPublicAppOrigin();
  const holderPath = `/partner/trust-execution?challenge_id=${encodeURIComponent(challengeId)}`;

  return {
    ok: true,
    preview: {
      verify_request: challengeId,
      handoff_ref: challengeId,
      partner_id: row.partnerId,
      policy_id: row.policyId,
      policy_version: row.policyVersion,
      purpose: "Scoped wallet trust execution authorization",
      application_id: row.applicationId ?? "",
      display_label: row.applicationId ?? "Partner application",
      environment: "sandbox",
      action: row.action || PARTNER_TRUST_EXECUTION_ACTION,
      result_family: "trust_execution",
      expires_at: row.expiresAt,
      return_url: `${origin}${holderPath}`,
      holder_path: holderPath,
      callback_bound: true,
    },
  };
}
