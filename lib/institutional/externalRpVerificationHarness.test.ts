import { describe, expect, it } from "vitest";
import { runExternalRpVerificationHarness, INSTITUTIONAL_RP_FIXTURE } from "./externalRpVerificationHarness";
import { signWebhookBody } from "@/lib/partner/webhooks/webhookSigning";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { NarrowPartnerResult } from "@/lib/partner/narrowPartnerResult/contract";

const publicReceipt = {
  receipt_id: "rcpt_ref_001",
  partner_id: INSTITUTIONAL_RP_FIXTURE.partner_id,
  policy_id: INSTITUTIONAL_RP_FIXTURE.policy_id,
  policy_version: 1,
  decision_result: "approved",
  signature_valid: true,
  status: "active",
  currently_valid: true,
  production_usable: false,
  expires_at: "2099-01-01T00:00:00.000Z",
  evaluated_claim_refs: [],
} as PartnerFlowPublicReceipt;

const narrowResult: NarrowPartnerResult = {
  schema_version: "1.0.0",
  receipt_id: "rcpt_ref_001",
  partner_id: INSTITUTIONAL_RP_FIXTURE.partner_id,
  policy_id: INSTITUTIONAL_RP_FIXTURE.policy_id,
  decision: "approved",
  result_family: "age_eligible_21",
  currently_valid: true,
  production_usable: false,
  trust_environment: "sandbox",
  invalidation_reasons: [],
};

describe("runExternalRpVerificationHarness", () => {
  it("runs neutral institutional fixture stages", async () => {
    const body = JSON.stringify({ event_type: "receipt.issued", receipt_id: "rcpt_ref_001" });
    const secret = "abx_whsec_fixture_test_secret_1234567890";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signWebhookBody({ secret, timestamp, rawBody: body });

    const result = await runExternalRpVerificationHarness({
      publicReceipt,
      narrowResult,
      receiptId: "rcpt_ref_001",
      requestId: "vr_reference_001",
      webhookBody: body,
      webhookSignature: signature,
      webhookSecret: secret,
      webhookTimestamp: timestamp,
      replayNonce: "nonce_harness_1",
    });

    expect(result.fixture.partner_id).toBe("institutional-platform");
    expect(result.stages.replay_rejection.ok).toBe(true);
    expect(result.stages.webhook_signature.ok).toBe(true);
  });
});
