// FILE: lib/partner/partnerSandboxIntegrationKit.ts
// External design-partner sandbox integration kit — dual-track milestones, glossary, and receipt checks.

import { SITE_URL } from "@/lib/siteUrl";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";

export const PARTNER_SANDBOX_INTEGRATION_HEADLINE =
  "Sandbox integration checklist";

export const PARTNER_SANDBOX_INTEGRATION_SUMMARY =
  "Two independent tracks: Partner Flow (browser redirect + public receipt verification) and Webhooks (optional, requires webhooks:read). Complete each track on its own — they do not share credentials or proof.";

export const PARTNER_SANDBOX_GLOSSARY = [
  {
    term: "Partner Flow track",
    definition:
      "Browser redirect to /partner/verify, callback with receipt_id, server-side GET /api/receipts/{receipt_id}/public verification. No API key in the browser.",
  },
  {
    term: "Webhook track",
    definition:
      "Optional outbound HTTPS notifications. Sandbox test events use partner.webhook.test — never connected to the public decision-receipt API.",
  },
  {
    term: "delivered (webhook)",
    definition:
      "HTTP delivery succeeded to your registered endpoint. This is not signature verification and does not prove receipt validity.",
  },
  {
    term: "Signature verified by your receiver",
    definition:
      "Manual acknowledgment that your handler validated the Abraxas webhook signature. Never inferred from delivery history or sandbox receipts.",
  },
  {
    term: "Sandbox receipt",
    definition:
      "Decision receipt from a sandbox policy. May have production_usable: false and currently_valid: false — expected for sandbox-only testing.",
  },
] as const;

export const PARTNER_FLOW_TRACK_MILESTONES = [
  {
    id: "ops_provisioned",
    title: "Operator provisioning",
    description:
      "Abraxas ops supplies partner_id, policy_id, and an allowlisted return_url. You cannot self-build a complete entry URL without all three.",
  },
  {
    id: "entry_url",
    title: "Partner Flow entry URL",
    description:
      "Redirect holders to /partner/verify with operator-supplied policy_id and return_url. Use the template below — do not guess missing values.",
  },
  {
    id: "callback_handler",
    title: "Callback handler",
    description:
      "Your server receives frozen callback query parameters (no PII) and fetches GET /api/receipts/{receipt_id}/public before granting access.",
  },
  {
    id: "sandbox_receipt_validated",
    title: "Sandbox receipt validated",
    description:
      "Confirm signature_valid, matching partner_id/policy_id, and approved decision. production_usable: false is expected — sandbox receipts never authorize Production access.",
  },
] as const;

export const WEBHOOK_TRACK_MILESTONES = [
  {
    id: "webhook_scope",
    title: "webhooks:read scope",
    description:
      "Default promote keys include verify:credential and verify:registry only. Request a separate key with webhooks:read from Abraxas ops for this track.",
  },
  {
    id: "endpoint_registered",
    title: "Endpoint registered",
    description: "Abraxas ops registers your HTTPS callback and enables delivery after you confirm signature handling.",
  },
  {
    id: "test_queued",
    title: "Test event queued",
    description: `User-initiated POST enqueues a single ${PARTNER_WEBHOOK_TEST_EVENT_TYPE} event. Queued does not mean delivered.`,
  },
  {
    id: "http_delivered",
    title: "HTTP delivered",
    description:
      "Delivery history shows status delivered — your endpoint returned a successful HTTP response. This is transport only, not signature verification.",
  },
  {
    id: "signature_verified",
    title: "Signature verified by your receiver",
    description:
      "Manually confirm your handler validated the Abraxas webhook signature. Abraxas cannot infer this from delivery records.",
  },
] as const;

export const SANDBOX_RECEIPT_CHECKS = [
  {
    check: "signature_valid === true",
    why: "Ed25519 signature over canonical payload_hash — required even in sandbox",
    required: true,
  },
  {
    check: "decision_result === \"approved\"",
    why: "Fail closed on denied or manual_review outcomes",
    required: true,
  },
  {
    check: "partner_id matches your integration",
    why: "Prevents cross-partner receipt replay",
    required: true,
  },
  {
    check: "policy_id matches your gate",
    why: "Ensures the evaluated policy is the one Abraxas ops provisioned",
    required: true,
  },
  {
    check: "production_usable may be false",
    why: "Expected for sandbox policies — do not use sandbox receipts to gate Production access",
    required: false,
  },
  {
    check: "currently_valid may be false",
    why: "Sandbox receipts often invalidate with production_not_usable:false — this is expected, not a failure",
    required: false,
  },
] as const;

export const SANDBOX_RECEIPT_PRODUCTION_WARNING =
  "Sandbox receipts with production_usable: false cannot authorize Production access. Reserve currently_valid === true for Production gates only.";

export const WEBHOOK_TEST_NOT_RECEIPT_API_NOTE =
  `${PARTNER_WEBHOOK_TEST_EVENT_TYPE} events are webhook transport tests only. They are never validated via GET /api/receipts/{receipt_id}/public.`;

export const PARTNER_FLOW_ENTRY_PLACEHOLDER_NOTE =
  "Abraxas operations supplies policy_id and return_url. Replace the placeholders below before redirecting holders.";

export interface SandboxReceiptInput {
  signature_valid?: boolean;
  decision_result?: string;
  partner_id?: string;
  policy_id?: string;
  production_usable?: boolean;
  currently_valid?: boolean;
  invalidation_reasons?: string[];
}

export interface SandboxReceiptCheckResult {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export function buildSandboxEntryUrlTemplate(partnerId: string, origin?: string): string {
  const base = (origin ?? SITE_URL).replace(/\/$/, "");
  const params = new URLSearchParams({
    partner_id: partnerId,
    policy_id: "<policy_id>",
    return_url: "<https://your-app.example.com/auth/abraxas/callback>",
  });
  return `${base}/partner/verify?${params.toString()}`;
}

export function partnerHasWebhooksReadScope(scopes: readonly string[]): boolean {
  return scopes.includes("webhooks:read");
}

export function evaluateSandboxReceiptChecks(
  receipt: SandboxReceiptInput | null | undefined,
  expected: { partnerId: string; policyId: string },
): { checks: SandboxReceiptCheckResult[]; sandboxValidationPassed: boolean } {
  const checks: SandboxReceiptCheckResult[] = [
    {
      id: "signature_valid",
      label: "signature_valid === true",
      passed: receipt?.signature_valid === true,
      detail: receipt?.signature_valid === true
        ? "Signature verified"
        : "Receipt signature is missing or invalid",
    },
    {
      id: "decision_approved",
      label: 'decision_result === "approved"',
      passed: receipt?.decision_result === "approved",
      detail:
        receipt?.decision_result === "approved"
          ? "Decision approved"
          : `Decision result: ${receipt?.decision_result ?? "missing"}`,
    },
    {
      id: "partner_match",
      label: "partner_id matches",
      passed: receipt?.partner_id === expected.partnerId,
      detail:
        receipt?.partner_id === expected.partnerId
          ? "Partner ID matches"
          : `Expected ${expected.partnerId}, got ${receipt?.partner_id ?? "missing"}`,
    },
    {
      id: "policy_match",
      label: "policy_id matches",
      passed: receipt?.policy_id === expected.policyId,
      detail:
        receipt?.policy_id === expected.policyId
          ? "Policy ID matches"
          : `Expected ${expected.policyId}, got ${receipt?.policy_id ?? "missing"}`,
    },
    {
      id: "sandbox_production_usable",
      label: "production_usable (informational)",
      passed: true,
      detail:
        receipt?.production_usable === false
          ? "production_usable: false — expected for sandbox; not a validation failure"
          : receipt?.production_usable === true
            ? "production_usable: true — unusual for sandbox policies"
            : "production_usable not set",
    },
    {
      id: "sandbox_currently_valid",
      label: "currently_valid (informational)",
      passed: true,
      detail: buildSandboxCurrentlyValidDetail(receipt),
    },
  ];

  const requiredChecks = checks.filter((c) =>
    ["signature_valid", "decision_approved", "partner_match", "policy_match"].includes(c.id),
  );
  const sandboxValidationPassed = requiredChecks.every((c) => c.passed);

  return { checks, sandboxValidationPassed };
}

function buildSandboxCurrentlyValidDetail(receipt: SandboxReceiptInput | null | undefined): string {
  if (receipt?.currently_valid === true) {
    return "currently_valid: true";
  }
  const reasons = receipt?.invalidation_reasons ?? [];
  if (reasons.includes("production_not_usable:false")) {
    return "currently_valid: false with production_not_usable:false — expected sandbox invalidation";
  }
  if (receipt?.currently_valid === false) {
    return `currently_valid: false${reasons.length ? ` (${reasons.join(", ")})` : ""}`;
  }
  return "currently_valid not set";
}

export type WebhookProgressStage = "not_started" | "queued" | "delivered" | "signature_verified";

export function deriveWebhookProgress(input: {
  hasQueuedTestEvent: boolean;
  hasDeliveredTestEvent: boolean;
  signatureVerifiedAcknowledged: boolean;
}): WebhookProgressStage {
  if (input.signatureVerifiedAcknowledged) return "signature_verified";
  if (input.hasDeliveredTestEvent) return "delivered";
  if (input.hasQueuedTestEvent) return "queued";
  return "not_started";
}
