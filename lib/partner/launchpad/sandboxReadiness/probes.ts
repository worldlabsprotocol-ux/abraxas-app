// FILE: lib/partner/launchpad/sandboxReadiness/probes.ts
// In-process fail-closed probes. TEST-only. Never issue a production receipt.

import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { runPartnerHarnessCase } from "@/lib/partner/launchpad/partnerTestHarness";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  signWebhookBody,
  verifyWebhookSignature,
} from "@/lib/partner/webhooks/webhookSigning";
import {
  buildPartnerWebhookTestPayload,
  webhookPayloadHasNoPii,
  webhookTestPayloadIsValid,
} from "@/lib/partner/webhooks/webhookPayloadContract";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";
import {
  SANDBOX_READINESS_LABEL,
  WEBHOOK_TEST_ALLOWED_EVENT_TYPES,
  type SandboxReadinessCode,
  type SandboxReadinessStatus,
} from "@/lib/partner/launchpad/sandboxReadiness/codes";

export interface ProbeResult {
  status: SandboxReadinessStatus;
  code: SandboxReadinessCode;
  detail: string;
  observed: "allow" | "deny" | "n/a";
  label: typeof SANDBOX_READINESS_LABEL;
}

const FIXTURE_NOW = new Date("2026-09-18T00:00:00.000Z");

function unsignedReceipt(partnerId: string, policyId: string, policyVersion: number): PartnerFlowPublicReceipt {
  return {
    receipt_id: "dr_sandbox_unsigned",
    partner_id: partnerId,
    policy_id: policyId,
    policy_version: policyVersion,
    decision_result: "approved",
    signature_valid: false,
    signature: "",
    payload_hash: "",
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    expires_at: "2026-12-01T00:00:00.000Z",
    currently_valid: false,
  } as PartnerFlowPublicReceipt;
}

export function probeUnsignedReceipt(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
}): ProbeResult {
  const receipt = unsignedReceipt(input.partnerId, input.policyId, input.policyVersion);
  const trust = evaluatePublicReceiptTrust(receipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    allowSandbox: true,
    now: FIXTURE_NOW,
  });
  const kit = new AbraxasPartnerKit({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    environment: "sandbox",
  }).evaluateFetchedReceipt(receipt);
  const denied = trust.currently_valid !== true && kit.action === "deny";
  return {
    status: denied ? "pass" : "fail",
    code: "receipt_unsigned",
    detail: denied
      ? "Unsigned receipt failed closed. No production receipt was issued."
      : "Unsigned receipt was not rejected.",
    observed: trust.currently_valid ? "allow" : "deny",
    label: SANDBOX_READINESS_LABEL,
  };
}

export function probeWrongPolicyVersion(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
}): ProbeResult {
  const caseResult = runPartnerHarnessCase({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    policyTemplateId: "age_21_retail",
    scenarioId: "approved",
    now: FIXTURE_NOW,
  });
  if ("ok" in caseResult && caseResult.ok === false) {
    return {
      status: "fail",
      code: "receipt_wrong_policy_version",
      detail: "Could not build a signed sandbox receipt for version mismatch.",
      observed: "n/a",
      label: SANDBOX_READINESS_LABEL,
    };
  }
  const receipt = {
    receipt_id: "dr_sandbox_wrong_version",
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: input.policyVersion + 7,
    decision_result: "approved",
    signature_valid: true,
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    expires_at: "2026-12-01T00:00:00.000Z",
  } as PartnerFlowPublicReceipt;
  const kit = new AbraxasPartnerKit({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    requirePolicyVersion: true,
    environment: "sandbox",
  }).evaluateFetchedReceipt(receipt);
  const denied = kit.action === "deny";
  return {
    status: denied ? "pass" : "fail",
    code: "receipt_wrong_policy_version",
    detail: denied
      ? `Pinned v${input.policyVersion} rejected receipt v${input.policyVersion + 7}.`
      : "Wrong policy version was not rejected.",
    observed: denied ? "deny" : "allow",
    label: SANDBOX_READINESS_LABEL,
  };
}

export function probeHarnessFailClosed(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  policyTemplateId: string;
  scenarioId: "denied" | "expired" | "revoked" | "wrong_partner" | "wrong_policy";
}): ProbeResult {
  const codeMap: Record<typeof input.scenarioId, SandboxReadinessCode> = {
    denied: "receipt_denied",
    expired: "receipt_expired",
    revoked: "receipt_revoked",
    wrong_partner: "receipt_wrong_partner",
    wrong_policy: "receipt_wrong_policy",
  };
  const result = runPartnerHarnessCase({
    ...input,
    now: FIXTURE_NOW,
  });
  if ("ok" in result && result.ok === false) {
    return {
      status: "fail",
      code: codeMap[input.scenarioId],
      detail: "Invalid fail-closed scenario.",
      observed: "n/a",
      label: SANDBOX_READINESS_LABEL,
    };
  }
  const passed = result.passed && result.observed_access === "deny" && result.production_usable === false;
  return {
    status: passed ? "pass" : "fail",
    code: codeMap[input.scenarioId],
    detail: passed
      ? `${input.scenarioId} receipt failed closed. Labeled ${SANDBOX_READINESS_LABEL}.`
      : `${input.scenarioId} did not fail closed.`,
    observed: result.observed_access,
    label: SANDBOX_READINESS_LABEL,
  };
}

export function probeWebhookHmacFixture(partnerId: string): ProbeResult {
  const secret = "abx_whsec_sandbox_readiness_fixture";
  const payload = buildPartnerWebhookTestPayload({
    eventId: "evt_sandbox_hmac",
    occurredAt: "2026-09-18T00:00:00.000Z",
    partnerId,
  });
  if (!webhookTestPayloadIsValid(payload) || payload.test !== true) {
    return {
      status: "fail",
      code: "webhook_hmac_unverified",
      detail: "TEST EVENT payload contract failed.",
      observed: "n/a",
      label: SANDBOX_READINESS_LABEL,
    };
  }
  const issuedLike = {
    event_id: payload.event_id,
    schema_version: "2026-09-18",
    event_type: "receipt.issued" as const,
    timestamp: payload.occurred_at,
    occurred_at: payload.occurred_at,
    partner_id: partnerId,
    policy_id: "policy-v1",
    policy_version: 1,
    receipt_id: "dr_sandbox_hmac",
    decision_id: null,
    outcome: "approved",
    reason_code: null,
  };
  if (!webhookPayloadHasNoPii(issuedLike)) {
    return {
      status: "fail",
      code: "webhook_hmac_unverified",
      detail: "Webhook fixture contained forbidden PII keys.",
      observed: "n/a",
      label: SANDBOX_READINESS_LABEL,
    };
  }
  const rawBody = JSON.stringify(payload);
  const timestamp = "1700000000";
  const signature = signWebhookBody({ secret, timestamp, rawBody });
  const good = verifyWebhookSignature({
    secret,
    timestamp,
    rawBody,
    signatureHeader: signature,
    nowSec: 1700000000,
  });
  const bad = verifyWebhookSignature({
    secret,
    timestamp,
    rawBody,
    signatureHeader: "v1=deadbeefdeadbeef",
    nowSec: 1700000000,
  });
  if (!good.ok || bad.ok) {
    return {
      status: "fail",
      code: "webhook_hmac_unverified",
      detail: "HMAC fixture did not verify the labeled TEST EVENT.",
      observed: "n/a",
      label: SANDBOX_READINESS_LABEL,
    };
  }
  return {
    status: "pass",
    code: "webhook_hmac_verified",
    detail: `HMAC verified for labeled ${PARTNER_WEBHOOK_TEST_EVENT_TYPE}. Fixture secret is not a live signing secret.`,
    observed: "n/a",
    label: SANDBOX_READINESS_LABEL,
  };
}

export function rejectUnsupportedEventType(eventType: string | null | undefined): ProbeResult | null {
  if (!eventType || eventType.trim() === "") return null;
  const allowed = WEBHOOK_TEST_ALLOWED_EVENT_TYPES as readonly string[];
  if (allowed.includes(eventType.trim())) return null;
  return {
    status: "fail",
    code: "event_type_not_supported",
    detail: `Event type ${eventType} is not a labeled TEST EVENT. Skip code event_type_not_supported.`,
    observed: "n/a",
    label: SANDBOX_READINESS_LABEL,
  };
}
