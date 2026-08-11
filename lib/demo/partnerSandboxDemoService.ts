// FILE: lib/demo/partnerSandboxDemoService.ts
// Admin-only sandbox partner demonstration — reuses production policy and receipt paths.

import { getActiveClaims } from "@/lib/credentials/claimsService";
import { getPublicReceipt } from "@/lib/decisionReceipts/service";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { maybeRecordPartnerFlowReceiptMetering } from "@/lib/partner/partnerMeteringHooks";
import {
  getHolderCredentialStatus,
  issuePartnerSessionReceipt,
} from "@/lib/partner/relyingPartyFlow";
import { maybeEnqueuePartnerReceiptIssued } from "@/lib/partner/webhooks/webhookHooks";
import { evaluateSubjectPolicy } from "@/lib/verification/requestsService";
import {
  assertSandboxDemoPartnerPolicy,
  assertSandboxDemoReceipt,
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
} from "@/lib/demo/partnerSandboxDemoBoundaries";
import { resolvePartnerSandboxDemoSubjectId } from "@/lib/demo/partnerSandboxDemoConfig";
import {
  buildDemoPassportStatusView,
  toDemoPublicReceiptView,
  type DemoPassportStatusView,
  type DemoPublicReceiptView,
  type DemoEvaluationView,
  type DemoCompletionView,
} from "@/lib/demo/partnerSandboxDemoViews";

function configuredSubjectId(): string {
  const resolved = resolvePartnerSandboxDemoSubjectId();
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }
  return resolved.subjectId;
}

export async function getPartnerSandboxDemoPassportStatus(): Promise<DemoPassportStatusView> {
  const subjectId = configuredSubjectId();
  const credential = await getHolderCredentialStatus(subjectId);
  const claims = await getActiveClaims(subjectId);
  const activeClaimTypes = claims
    .filter((c) => c.status === "active")
    .map((c) => c.claim_type);

  return buildDemoPassportStatusView({
    credentialStatus: credential.status,
    activeClaimTypes,
  });
}

export async function evaluatePartnerSandboxDemoPolicy(): Promise<DemoEvaluationView> {
  const subjectId = configuredSubjectId();
  assertSandboxDemoPartnerPolicy({
    partnerId: DEMO_SANDBOX_PARTNER_ID,
    policyId: DEMO_SANDBOX_POLICY_ID,
  });

  const result = await evaluateSubjectPolicy(
    subjectId,
    DEMO_SANDBOX_POLICY_ID,
    DEMO_SANDBOX_PARTNER_ID,
  );

  return {
    partner_id: DEMO_SANDBOX_PARTNER_ID,
    policy_id: DEMO_SANDBOX_POLICY_ID,
    decision: result.decision,
    reason_codes: result.reason_codes,
    missing_claims: result.missing_claims ?? [],
    decision_context: result.decision_context ?? "sandbox_only",
    production_usable: result.production_usable ?? false,
  };
}

export async function completePartnerSandboxDemoReceipt(): Promise<DemoCompletionView> {
  const subjectId = configuredSubjectId();
  assertSandboxDemoPartnerPolicy({
    partnerId: DEMO_SANDBOX_PARTNER_ID,
    policyId: DEMO_SANDBOX_POLICY_ID,
  });

  const credential = await getHolderCredentialStatus(subjectId);
  if (credential.status !== "active" || !credential.credential_jti) {
    throw new Error("demo_credential_not_active");
  }

  const issued = await issuePartnerSessionReceipt({
    suiAddress: subjectId,
    partnerId: DEMO_SANDBOX_PARTNER_ID,
    policyId: DEMO_SANDBOX_POLICY_ID,
    credentialJti: credential.credential_jti,
  });

  const record = await getReceiptById(issued.receipt_id);
  if (!record) {
    throw new Error("demo_receipt_not_found");
  }
  assertSandboxDemoReceipt(record);

  maybeRecordPartnerFlowReceiptMetering({
    partnerId: DEMO_SANDBOX_PARTNER_ID,
    replayStatus: issued.replay_status,
    decision: issued.partner_result.decision,
    receiptId: issued.receipt_id,
    policyId: DEMO_SANDBOX_POLICY_ID,
    decisionId: issued.decision_id,
  });

  maybeEnqueuePartnerReceiptIssued({
    partnerId: DEMO_SANDBOX_PARTNER_ID,
    replayStatus: issued.replay_status,
    decision: issued.partner_result.decision,
    receiptId: issued.receipt_id,
    policyId: DEMO_SANDBOX_POLICY_ID,
    decisionId: issued.decision_id,
  });

  return {
    partner_id: DEMO_SANDBOX_PARTNER_ID,
    policy_id: DEMO_SANDBOX_POLICY_ID,
    decision_id: issued.decision_id,
    receipt_id: issued.receipt_id,
    replay_status: issued.replay_status,
    decision: issued.partner_result.decision,
  };
}

export async function validatePartnerSandboxDemoReceipt(
  receiptId: string,
): Promise<DemoPublicReceiptView> {
  assertSandboxDemoPartnerPolicy({
    partnerId: DEMO_SANDBOX_PARTNER_ID,
    policyId: DEMO_SANDBOX_POLICY_ID,
  });

  const record = await getReceiptById(receiptId);
  if (!record) {
    throw new Error("demo_receipt_not_found");
  }
  assertSandboxDemoReceipt(record);

  const publicView = await getPublicReceipt(receiptId);
  if (!publicView) {
    throw new Error("demo_public_receipt_unavailable");
  }

  return toDemoPublicReceiptView(publicView);
}
