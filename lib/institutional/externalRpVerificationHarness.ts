// Neutral institutional relying-party harness — public interfaces only (no Cielo / Good Trouble).

import {
  REFERENCE_APPLICATION_A,
  REFERENCE_INSTITUTIONAL_PLATFORM,
  REFERENCE_POLICY_ID,
} from "@/lib/operations/institutionalProof/runReferenceScenario";
import { ExternalInstitutionalConsumer } from "@/lib/operations/institutionalProof/externalConsumer";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { NarrowPartnerResult } from "@/lib/partner/narrowPartnerResult/contract";
import { verifyWebhookSignature } from "@/lib/partner/webhooks/webhookSigning";
import { consumeInstitutionalDurableReplayNonce } from "@/lib/institutional/durableReplayNonceStore";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";

export const INSTITUTIONAL_RP_FIXTURE = {
  partner_id: REFERENCE_INSTITUTIONAL_PLATFORM,
  policy_id: REFERENCE_POLICY_ID,
  application_id: REFERENCE_APPLICATION_A,
  policy_version: 1,
} as const;

export type ExternalRpHarnessStage =
  | "scoped_request"
  | "receipt_verify"
  | "validity_recheck"
  | "webhook_signature"
  | "replay_rejection";

export type ExternalRpHarnessResult = {
  fixture: typeof INSTITUTIONAL_RP_FIXTURE;
  stages: Record<ExternalRpHarnessStage, { ok: boolean; detail: string }>;
  all_ok: boolean;
};

export async function runExternalRpVerificationHarness(input: {
  publicReceipt: PartnerFlowPublicReceipt;
  narrowResult: NarrowPartnerResult;
  receiptId: string;
  requestId: string;
  webhookBody?: string;
  webhookSignature?: string;
  webhookSecret?: string;
  webhookTimestamp?: string;
  replayNonce?: string;
}): Promise<ExternalRpHarnessResult> {
  const consumer = new ExternalInstitutionalConsumer({
    partnerId: INSTITUTIONAL_RP_FIXTURE.partner_id,
    policyId: INSTITUTIONAL_RP_FIXTURE.policy_id,
    policyVersion: INSTITUTIONAL_RP_FIXTURE.policy_version,
    applicationId: INSTITUTIONAL_RP_FIXTURE.application_id,
    environment: "sandbox",
  });

  const stages: ExternalRpHarnessResult["stages"] = {
    scoped_request: {
      ok: input.requestId.startsWith("vr_") || input.requestId.length > 8,
      detail: "verification request id present",
    },
    receipt_verify: { ok: false, detail: "pending" },
    validity_recheck: { ok: false, detail: "pending" },
    webhook_signature: { ok: true, detail: "skipped" },
    replay_rejection: { ok: true, detail: "skipped" },
  };

  const verified = await consumer.verifyApplicationResult({
    receiptId: input.receiptId,
    requestId: input.requestId,
    publicReceipt: input.publicReceipt,
    narrowResult: input.narrowResult,
  });

  stages.receipt_verify = {
    ok: verified.receipt_verification_ok && verified.narrow_verification_ok,
    detail: verified.receipt_errors.join("; ") || "kit_ok",
  };

  stages.validity_recheck = {
    ok: input.narrowResult.currently_valid === input.publicReceipt.currently_valid,
    detail: "narrow/public validity alignment",
  };

  if (input.webhookBody && input.webhookSignature && input.webhookSecret) {
    const timestamp = input.webhookTimestamp ?? String(Math.floor(Date.now() / 1000));
    const sig = verifyWebhookSignature({
      rawBody: input.webhookBody,
      signatureHeader: input.webhookSignature,
      secret: input.webhookSecret,
      timestamp,
    });
    stages.webhook_signature = { ok: sig.ok, detail: sig.ok ? "hmac_valid" : ("error" in sig ? sig.error : "invalid") };
  }

  if (input.replayNonce) {
    resetFakeWalletStandardBackend();
    const scope = {
      partnerId: INSTITUTIONAL_RP_FIXTURE.partner_id,
      applicationId: INSTITUTIONAL_RP_FIXTURE.application_id,
      receiptId: input.receiptId,
      subjectPseudonymId: "subject_fixture",
      policyId: INSTITUTIONAL_RP_FIXTURE.policy_id,
      policyVersion: INSTITUTIONAL_RP_FIXTURE.policy_version,
      actionScope: "institutional:consume",
      nonce: input.replayNonce,
    };
    const first = await consumeInstitutionalDurableReplayNonce(scope);
    const second = await consumeInstitutionalDurableReplayNonce(scope);
    stages.replay_rejection = {
      ok: first.ok && !second.ok && second.code === "replayed",
      detail: "durable_replay_nonce_single_use",
    };
  }

  const all_ok = Object.values(stages).every(s => s.ok);
  return { fixture: INSTITUTIONAL_RP_FIXTURE, stages, all_ok };
}
