// FILE: lib/assurance/ageProviders/reuseService.ts
// Re-evaluate existing Abraxas credential and issue fresh partner-bound receipt.

import { completePartnerFlowAfterApproval } from "@/lib/partner/relyingPartyFlow";
import { getHolderCredentialStatus } from "@/lib/partner/relyingPartyFlow";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";

export interface AgeAssuranceReuseInput {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  verificationRequestId?: string;
}

export type AgeAssuranceReuseResult =
  | {
      ok: true;
      redirect_url: string;
      decision_id?: string;
      receipt_id?: string;
      replay_status?: string;
    }
  | {
      ok: false;
      code: string;
      error: string;
    };

export async function reuseExistingAgeCredential(
  input: AgeAssuranceReuseInput,
): Promise<AgeAssuranceReuseResult> {
  if (!await isAllowedPartnerReturnUrl(input.partnerId, input.returnUrl)) {
    return { ok: false, code: "return_url_not_allowed", error: "return_url not allowlisted" };
  }

  const credential = await getHolderCredentialStatus(input.suiAddress);
  if (credential.status === "expired") {
    return { ok: false, code: "credential_expired", error: "Credential expired" };
  }
  if (credential.status === "revoked") {
    return { ok: false, code: "credential_revoked", error: "Credential revoked" };
  }
  if (credential.status !== "active" || !credential.credential_jti) {
    return { ok: false, code: "no_active_credential", error: "No active credential" };
  }

  const evaluation = await evaluatePolicyForSubject({
    suiAddress: input.suiAddress,
    policyId: input.policyId,
    partnerId: input.partnerId,
  });

  if (evaluation.evaluation.decision !== "approved") {
    return {
      ok: false,
      code: "policy_not_satisfied",
      error: "Credential does not satisfy current policy",
    };
  }

  const completed = await completePartnerFlowAfterApproval({
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    returnUrl: input.returnUrl,
    verificationRequestId: input.verificationRequestId,
  });

  if (!completed.ok) {
    return { ok: false, code: "completion_failed", error: completed.error };
  }

  if (!completed.redirect_url) {
    return { ok: false, code: "no_redirect", error: "Receipt issuance did not produce redirect" };
  }

  return {
    ok: true,
    redirect_url: completed.redirect_url,
    decision_id: completed.decision_id,
    receipt_id: completed.partner_result?.receipt_id,
    replay_status: completed.replay_status,
  };
}
