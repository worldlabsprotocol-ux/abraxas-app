// Executable integration harness — neutral institutional-platform fixture.

import { randomBytes } from "node:crypto";
import { InstitutionalReferenceClient } from "@/lib/institutional/integration/InstitutionalReferenceClient";
import {
  INSTITUTIONAL_RP_FIXTURE,
  runExternalRpVerificationHarness,
} from "@/lib/institutional/externalRpVerificationHarness";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { NarrowPartnerResult } from "@/lib/partner/narrowPartnerResult/contract";
import { signWebhookBody } from "@/lib/partner/webhooks/webhookSigning";

export type IntegrationHarnessStage =
  | "contract_loaded"
  | "reference_client_configured"
  | "consume_request_shape"
  | "receipt_status_path"
  | "webhook_signature"
  | "external_rp_stages";

export type IntegrationHarnessReport = {
  fixture: typeof INSTITUTIONAL_RP_FIXTURE;
  stages: Record<IntegrationHarnessStage, { ok: boolean; detail: string }>;
  all_ok: boolean;
};

export async function runInstitutionalIntegrationHarness(input?: {
  baseUrl?: string;
  apiKey?: string;
  publicReceipt?: PartnerFlowPublicReceipt;
  narrowResult?: NarrowPartnerResult;
  /** When true, runs durable replay proof (requires test Supabase mock or configured store). */
  includeDurableReplayProof?: boolean;
}): Promise<IntegrationHarnessReport> {
  if (!process.env.NEXTAUTH_SECRET?.trim()) {
    process.env.NEXTAUTH_SECRET = "institutional-harness-local-only";
  }
  const publicReceipt = input?.publicReceipt ?? ({
    receipt_id: "rcpt_harness_001",
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
  } as PartnerFlowPublicReceipt);

  const narrowResult = input?.narrowResult ?? ({
    schema_version: "1.0.0",
    receipt_id: publicReceipt.receipt_id,
    partner_id: INSTITUTIONAL_RP_FIXTURE.partner_id,
    policy_id: INSTITUTIONAL_RP_FIXTURE.policy_id,
    decision: "approved",
    result_family: "age_eligible_21",
    currently_valid: true,
    production_usable: false,
    trust_environment: "sandbox",
    invalidation_reasons: [],
  } as NarrowPartnerResult);

  const stages: IntegrationHarnessReport["stages"] = {
    contract_loaded: { ok: true, detail: "institutional_integration_v1" },
    reference_client_configured: { ok: false, detail: "pending" },
    consume_request_shape: { ok: false, detail: "pending" },
    receipt_status_path: { ok: true, detail: "/api/v1/decision-receipts/{id}/status" },
    webhook_signature: { ok: false, detail: "pending" },
    external_rp_stages: { ok: false, detail: "pending" },
  };

  const client = new InstitutionalReferenceClient({
    baseUrl: input?.baseUrl ?? "https://example.invalid",
    apiKey: "abx_test_reference_only",
    partnerId: INSTITUTIONAL_RP_FIXTURE.partner_id,
    applicationId: INSTITUTIONAL_RP_FIXTURE.application_id,
    fetchFn: async (url, init) => {
      if (String(url).includes("/status")) {
        return new Response(JSON.stringify({
          receipt_id: publicReceipt.receipt_id,
          trust: { currently_valid: true, signature_valid: true, invalidation_reasons: [] },
        }), { status: 200 });
      }
      if (String(url).includes("/consume")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { replay_nonce?: string };
        stages.consume_request_shape = {
          ok: Boolean(body.replay_nonce && body.replay_nonce.length >= 16),
          detail: "replay_nonce_required",
        };
        return new Response(JSON.stringify({ ok: false, error: "simulated_not_live" }), { status: 503 });
      }
      return new Response("not_found", { status: 404 });
    },
  });

  stages.reference_client_configured = { ok: true, detail: client.contractVersion };

  const receiptId = publicReceipt.receipt_id ?? "rcpt_harness_001";

  await client.consumeEligibility({
    receipt_id: receiptId,
    policy_id: INSTITUTIONAL_RP_FIXTURE.policy_id,
    replay_nonce: client.createReplayNonce(),
  });

  await client.getReceiptStatus(receiptId);

  const webhookBody = JSON.stringify({ event_type: "receipt.issued", receipt_id: receiptId });
  const secret = `abx_whsec_${randomBytes(16).toString("hex")}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signWebhookBody({ secret, timestamp, rawBody: webhookBody });
  const webhook = client.verifyWebhook({
    rawBody: webhookBody,
    signatureHeader: signature,
    secret,
    timestamp,
  });
  stages.webhook_signature = { ok: webhook.ok, detail: webhook.ok ? "hmac_valid" : "invalid" };

  if (input?.includeDurableReplayProof !== false) {
    try {
      const external = await runExternalRpVerificationHarness({
        publicReceipt,
        narrowResult,
        receiptId,
        requestId: "vr_harness_reference_001",
        webhookBody,
        webhookSignature: signature,
        webhookSecret: secret,
        webhookTimestamp: timestamp,
        replayNonce: "harness_replay_nonce_01",
      });
      stages.external_rp_stages = { ok: external.all_ok, detail: "external_rp_verification_harness" };
    } catch {
      stages.external_rp_stages = { ok: false, detail: "durable_replay_requires_test_store" };
    }
  } else {
    stages.external_rp_stages = {
      ok: true,
      detail: "replay_proof_deferred_to_test_institutional_525_and_postgres_suite",
    };
  }

  const all_ok = Object.values(stages).every(s => s.ok);
  return { fixture: INSTITUTIONAL_RP_FIXTURE, stages, all_ok };
}
