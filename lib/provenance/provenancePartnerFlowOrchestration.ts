// FILE: lib/provenance/provenancePartnerFlowOrchestration.ts
// Evaluate/complete orchestration for content-origin-disclosure partner flows.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { isReturnUrlAllowed, buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import { createVerificationRequest, getPolicy } from "@/lib/verification/requestsService";
import {
  getHolderCredentialStatus,
  issuePartnerSessionReceipt,
  type PartnerFlowEvaluateResult,
} from "@/lib/partner/relyingPartyFlow";
import { applyPartnerFlowTrustGate } from "@/lib/partner/partnerFlowCurrentAuthorization";
import { checkPartnerFlowRevocationGate } from "@/lib/partner/partnerFlowRevocationRuntime";
import { resolveWalletControlZeroEvidenceOutcome } from "@/lib/walletControl/recoverableWalletControlRevocation";
import { buildProvenancePartnerVerificationResult } from "@/lib/partner/provenancePartnerResult";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import { resolveProvenanceSandboxCredentialJti } from "./constants";
import { evaluateContentOriginDisclosure } from "./contentOriginDisclosure";
import { getActiveArtifactBinding } from "./artifactStore";
import { loadProvenanceSession, saveProvenanceSession } from "./provenanceSessionStore";

function buildPassportUrl(input: {
  verificationRequestId: string;
  partnerId: string;
  policyId: string;
  purpose?: string;
  appOrigin?: string;
}): string {
  const appUrl = (input.appOrigin ?? getPublicAppOrigin()).replace(/\/$/, "");
  const params = new URLSearchParams({
    verify_request: input.verificationRequestId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
  });
  if (input.purpose) params.set("purpose", input.purpose);
  return `${appUrl}/partner/continue?${params.toString()}`;
}

async function denyIfRevoked(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  operation: "evaluate" | "complete";
  verificationRequestId?: string;
}): Promise<PartnerFlowEvaluateResult | null> {
  const denied = await checkPartnerFlowRevocationGate({
    subjectId: input.suiAddress,
    partnerId: input.partnerId,
    policyId: input.policyId,
    operation: input.operation,
    verificationRequestId: input.verificationRequestId,
  });
  if (!denied) return null;

  const recoverable = resolveWalletControlZeroEvidenceOutcome({
    policyId: input.policyId,
    invalidationReasons: denied.invalidation_reasons,
    validity: denied.validity,
  });
  if (recoverable) return recoverable;

  const policy = await getPolicy(input.policyId);
  return {
    ...denied,
    policy_version: policy?.version,
  };
}

async function resolveProvenanceCredentialJti(subject: string): Promise<string | null> {
  const credential = await getHolderCredentialStatus(subject);
  if (credential.status === "active" && credential.credential_jti) {
    return credential.credential_jti;
  }
  return resolveProvenanceSandboxCredentialJti(subject);
}

export async function evaluateContentOriginDisclosurePartnerFlow(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string;
  appOrigin?: string;
  expectedPolicyVersion?: number;
  expectedContentHash?: string | null;
  launchpadApplicationId?: string | null;
}): Promise<PartnerFlowEvaluateResult> {
  if (!await isReturnUrlAllowed(input.partnerId, input.returnUrl)) {
    throw new Error("return_url not allowlisted for partner");
  }

  const subject = normalizeSuiAddress(input.suiAddress);
  const revoked = await denyIfRevoked({
    suiAddress: subject,
    partnerId: input.partnerId,
    policyId: input.policyId,
    operation: "evaluate",
  });
  if (revoked) return revoked;

  const sessionHash = input.expectedContentHash?.trim().toLowerCase() ?? null;
  if (sessionHash) {
    const claims = await getActiveClaims(subject);
    const binding = await getActiveArtifactBinding({ subjectId: subject, contentHash: sessionHash });
    const evaluation = evaluateContentOriginDisclosure({
      claims,
      submittedContentHash: sessionHash,
      artifactBinding: binding,
      expectedContentHash: sessionHash,
    });

    if (evaluation.decision === "approved") {
      const credentialJti = await resolveProvenanceCredentialJti(subject);
      if (!credentialJti) {
        return { next: "authenticate" };
      }

      const issued = await issueProvenanceSessionReceipt({
        suiAddress: subject,
        partnerId: input.partnerId,
        policyId: input.policyId,
        credentialJti,
        submittedContentHash: sessionHash,
        expectedPolicyVersion: input.expectedPolicyVersion,
        launchpadApplicationId: input.launchpadApplicationId,
      });

      const redirect_url = buildRedirectUrl(input.returnUrl, {
        status: "approved",
        decision_id: issued.decision_id,
        receipt_id: issued.receipt_id,
        receipt_expires_at: issued.receipt_expires_at,
        credential_id: credentialJti,
        policy_id: input.policyId,
        partner_id: input.partnerId,
      });

      return applyPartnerFlowTrustGate({
        next: "enter",
        redirect_url,
        partner_result: issued.partner_result,
        replay_status: issued.replay_status,
        currently_valid: issued.currently_valid,
        validity: issued.validity,
        invalidation_reasons: issued.invalidation_reasons,
        decision_id: issued.decision_id,
      }, {
        currently_valid: issued.currently_valid,
        validity: issued.validity,
        invalidation_reasons: issued.invalidation_reasons,
      });
    }
  }

  const policy = await getPolicy(input.policyId);
  const request = await createVerificationRequest({
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: input.purpose ?? "content_provenance",
    requestedAction: "content_origin_disclosure",
    suiAddress: subject,
    returnUrl: input.returnUrl,
    appOrigin: input.appOrigin,
    expectedPolicyVersion: input.expectedPolicyVersion ?? policy?.version,
  });

  await saveProvenanceSession({
    verificationRequestId: request.request_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    expectedContentHash: sessionHash,
  });

  return {
    next: "passport",
    verification_request_id: request.request_id,
    passport_url: buildPassportUrl({
      verificationRequestId: request.request_id,
      partnerId: input.partnerId,
      policyId: input.policyId,
      purpose: input.purpose,
      appOrigin: input.appOrigin,
    }),
    policy_version: policy?.version,
  };
}

export async function issueProvenanceSessionReceipt(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  credentialJti: string;
  submittedContentHash: string;
  verificationRequestId?: string;
  expectedPolicyVersion?: number;
  launchpadApplicationId?: string | null;
}) {
  const subject = normalizeSuiAddress(input.suiAddress);
  const claims = await getActiveClaims(subject);
  const binding = await getActiveArtifactBinding({
    subjectId: subject,
    contentHash: input.submittedContentHash,
  });
  const session = input.verificationRequestId
    ? await loadProvenanceSession(input.verificationRequestId)
    : null;

  const evaluation = evaluateContentOriginDisclosure({
    claims,
    submittedContentHash: input.submittedContentHash,
    artifactBinding: binding,
    expectedContentHash: session?.expectedContentHash ?? input.submittedContentHash,
  });

  if (evaluation.decision !== "approved") {
    throw new Error(`provenance_evaluation_denied:${evaluation.reason_codes.join(",")}`);
  }

  const issued = await issuePartnerSessionReceipt({
    suiAddress: subject,
    partnerId: input.partnerId,
    policyId: input.policyId,
    credentialJti: input.credentialJti,
    verificationRequestId: input.verificationRequestId,
    expectedPolicyVersion: input.expectedPolicyVersion,
    launchpadApplicationId: input.launchpadApplicationId,
  });

  const partner_result = buildProvenancePartnerVerificationResult({
    base: issued.partner_result,
    evaluation,
  });

  return {
    ...issued,
    partner_result,
  };
}
