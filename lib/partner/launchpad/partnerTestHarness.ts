// FILE: lib/partner/launchpad/partnerTestHarness.ts
// Self-service partner test harness — real receipt trust evaluation, no fake green states.

import { randomBytes } from "crypto";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  loadReceiptSigningKey,
  signReceiptPayload,
  verifyReceiptSignature,
  type ReceiptSigningKeyPair,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { assertNoPiiInPublicView } from "@/lib/decisionReceipts/views";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import {
  evaluatePublicReceiptTrust,
  type TrustEvaluationResult,
} from "@/lib/decisionReceipts/trustEvaluation";
import {
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";
import { resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/customPolicy";

export const HARNESS_CALLBACK_ALLOWED_KEYS = ["receipt_id", "decision", "status"] as const;

export const HARNESS_FORBIDDEN_CALLBACK_TERMS = [
  "date_of_birth",
  "email",
  "legal_name",
  "passport_image",
  "selfie",
  "document_number",
  "id_token",
] as const;

export type PartnerHarnessScenarioId =
  | "approved"
  | "denied"
  | "expired"
  | "revoked"
  | "wrong_partner"
  | "wrong_policy"
  | "replay"
  | "sandbox_not_production"
  | "pii_absent";

export const REQUIRED_HARNESS_SCENARIOS: PartnerHarnessScenarioId[] = [
  "approved",
  "denied",
  "expired",
  "revoked",
  "wrong_partner",
  "wrong_policy",
  "replay",
  "sandbox_not_production",
  "pii_absent",
];

export interface PartnerHarnessScenario {
  id: PartnerHarnessScenarioId;
  label: string;
  description: string;
  expectedAccess: "allow_sandbox" | "deny";
}

export const PARTNER_HARNESS_SCENARIOS: PartnerHarnessScenario[] = [
  {
    id: "approved",
    label: "Approved sandbox receipt",
    description: "A signed sandbox approved receipt is currently_valid when sandbox mode is explicit.",
    expectedAccess: "allow_sandbox",
  },
  {
    id: "denied",
    label: "Denied receipt",
    description: "A signed denied receipt cannot grant access.",
    expectedAccess: "deny",
  },
  {
    id: "expired",
    label: "Expired receipt",
    description: "An expired receipt fails closed.",
    expectedAccess: "deny",
  },
  {
    id: "revoked",
    label: "Revoked receipt",
    description: "A revoked receipt fails closed.",
    expectedAccess: "deny",
  },
  {
    id: "wrong_partner",
    label: "Wrong partner",
    description: "A receipt issued to another partner fails audience checks.",
    expectedAccess: "deny",
  },
  {
    id: "wrong_policy",
    label: "Wrong policy",
    description: "A receipt for a different policy_id fails closed.",
    expectedAccess: "deny",
  },
  {
    id: "replay",
    label: "Reused public receipt",
    description: "Public receipt verification is not a one-time consume; the same valid sandbox receipt still verifies. Partner Flow evaluate uses idempotency separately.",
    expectedAccess: "allow_sandbox",
  },
  {
    id: "sandbox_not_production",
    label: "Sandbox is not production",
    description: "A sandbox_only receipt is rejected when production mode is required.",
    expectedAccess: "deny",
  },
  {
    id: "pii_absent",
    label: "No PII in callback or receipt",
    description: "Callback query keys and public receipt JSON omit holder documents and contact fields.",
    expectedAccess: "allow_sandbox",
  },
];

export function resolvePartnerHarnessScenario(id: string): PartnerHarnessScenario | null {
  return PARTNER_HARNESS_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}

export interface HarnessCallbackParams {
  receipt_id: string;
  decision: string;
  status: string;
}

export interface PartnerHarnessCaseResult {
  scenario_id: PartnerHarnessScenarioId;
  simulated: false;
  passed: boolean;
  expected_access: "allow_sandbox" | "deny";
  observed_access: "allow" | "deny";
  validity: string;
  invalidation_reasons: string[];
  signature_valid: boolean;
  production_usable: boolean;
  callback_params: HarnessCallbackParams;
  pii_scan_passed: boolean;
  signing_source: "configured_issuer_key" | "ephemeral_harness_key";
  replay_second_pass?: boolean;
  verification_path: "evaluatePublicReceiptTrust+validatePartnerFlowPublicReceipt";
}

const PII_JSON_NEEDLES = [
  "date_of_birth",
  "\"email\"",
  "legal_name",
  "passport_image",
  "selfie",
  "document_number",
];

function resolveHarnessSigningKey(): { key: ReceiptSigningKeyPair; source: PartnerHarnessCaseResult["signing_source"] } {
  const configured = loadReceiptSigningKey();
  if (configured) return { key: configured, source: "configured_issuer_key" };
  return { key: generateTestSigningKeyPair(), source: "ephemeral_harness_key" };
}

function buildSignedPublicReceipt(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  decision: "approved" | "denied";
  context: "sandbox_only" | "production";
  expiresAt: string;
  status: "active" | "expired" | "revoked";
  key: ReceiptSigningKeyPair;
  claimType: string;
}): PartnerFlowPublicReceipt & DecisionReceiptPublicView {
  const evaluatedAt = "2026-09-01T00:00:00.000Z";
  const payload = buildCanonicalPayload({
    receipt_id: `dr_harness_${randomBytes(8).toString("hex")}`,
    decision_id: `00000000-0000-4000-8000-${randomBytes(6).toString("hex").slice(0, 12)}`,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    partner_id: input.partnerId,
    subject_pseudonym_id: subjectPseudonymId("0xharness"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: input.decision,
    reason_codes: input.decision === "approved" ? ["all_claims_met"] : ["missing_required_claim"],
    evaluated_claim_refs: [{
      claim_id: "claim-harness",
      claim_type: input.claimType,
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: evaluatedAt,
      expires_at: null,
    }],
    issuer_refs: ["issuer:abraxas"],
    decision_context: input.context,
    evaluated_at: evaluatedAt,
    expires_at: input.expiresAt,
  });
  const { payloadHash, signature } = signReceiptPayload(payload, input.key.privateKeyJwk);
  const signatureValid = verifyReceiptSignature(payload, signature, input.key.publicKeyJwk);
  const productionUsable = input.context === "production";
  return {
    receipt_id: payload.receipt_id,
    schema_version: payload.schema_version,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    partner_id: payload.partner_id,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    decision_result: payload.decision_result,
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: payload.decision_context,
    production_usable: productionUsable,
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    status: input.status,
    payload_hash: payloadHash,
    signature,
    signing_key_id: input.key.signingKeyId,
    signature_valid: signatureValid,
    currently_valid: false,
    validity: "sandbox_only",
    invalidation_reasons: productionUsable ? [] : ["production_not_usable:false"],
    artifact_type: "eligibility_decision_receipt",
    anchor_reference: null,
  };
}

function callbackParams(receipt: PartnerFlowPublicReceipt): HarnessCallbackParams {
  return {
    receipt_id: String(receipt.receipt_id ?? ""),
    decision: String(receipt.decision_result ?? ""),
    status: String(receipt.status ?? ""),
  };
}

function piiScan(receipt: PartnerFlowPublicReceipt, params: HarnessCallbackParams): boolean {
  const json = JSON.stringify({ receipt, params }).toLowerCase();
  if (HARNESS_FORBIDDEN_CALLBACK_TERMS.some((term) => Object.keys(params).includes(term))) {
    return false;
  }
  if (PII_JSON_NEEDLES.some((needle) => json.includes(needle))) return false;
  try {
    assertNoPiiInPublicView(receipt as DecisionReceiptPublicView);
  } catch {
    return false;
  }
  return true;
}

function accessFromTrust(trust: TrustEvaluationResult): "allow" | "deny" {
  return trust.currently_valid ? "allow" : "deny";
}

export function runPartnerHarnessCase(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  policyTemplateId: string;
  scenarioId: string;
  now?: Date;
  signingKey?: ReceiptSigningKeyPair;
}): PartnerHarnessCaseResult | { ok: false; code: "invalid_scenario" } {
  const scenario = resolvePartnerHarnessScenario(input.scenarioId);
  if (!scenario) return { ok: false, code: "invalid_scenario" };

  const { key, source } = input.signingKey
    ? { key: input.signingKey, source: "ephemeral_harness_key" as const }
    : resolveHarnessSigningKey();

  const pack = resolvePolicyPack(input.policyTemplateId);
  const claimType = pack?.required_claims[0]
    ?? (input.policyTemplateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID ? "identity_verified" : "identity_verified");

  const future = "2026-12-01T00:00:00.000Z";
  const past = "2020-01-01T00:00:00.000Z";
  const now = input.now ?? new Date("2026-09-18T00:00:00.000Z");

  let receiptPartner = input.partnerId;
  let receiptPolicy = input.policyId;
  let decision: "approved" | "denied" = "approved";
  let expiresAt = future;
  let status: "active" | "expired" | "revoked" = "active";
  let context: "sandbox_only" | "production" = "sandbox_only";

  if (scenario.id === "denied") decision = "denied";
  if (scenario.id === "expired") {
    expiresAt = past;
    status = "expired";
  }
  if (scenario.id === "revoked") status = "revoked";
  if (scenario.id === "wrong_partner") receiptPartner = "other-partner";
  if (scenario.id === "wrong_policy") receiptPolicy = "other-policy-v1";

  const receipt = buildSignedPublicReceipt({
    partnerId: receiptPartner,
    policyId: receiptPolicy,
    policyVersion: input.policyVersion,
    decision,
    context,
    expiresAt,
    status,
    key,
    claimType,
  });

  const sandboxTrust = evaluatePublicReceiptTrust(receipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    allowSandbox: true,
    now,
  });
  const productionValidation = validatePartnerFlowPublicReceipt(receipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    now,
    mode: "production",
  });
  const sandboxValidation = validatePartnerFlowPublicReceipt(receipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    now,
    mode: "sandbox",
    allowSandbox: true,
  });

  const params = callbackParams(receipt);
  const piiOk = piiScan(receipt, params);

  let observed: "allow" | "deny" = accessFromTrust(sandboxTrust);
  let validity = sandboxTrust.validity;
  let reasons = sandboxTrust.invalidation_reasons;
  let signatureValid = sandboxTrust.signature_valid;
  let productionUsable = sandboxTrust.production_usable;
  let replaySecondPass: boolean | undefined;

  if (scenario.id === "sandbox_not_production") {
    observed = productionValidation.ok ? "allow" : "deny";
    validity = productionValidation.trust?.validity ?? (productionValidation.ok ? "active" : "sandbox_only");
    reasons = productionValidation.errors;
    signatureValid = receipt.signature_valid === true;
    productionUsable = receipt.production_usable === true;
  }

  if (scenario.id === "replay") {
    const second = evaluatePublicReceiptTrust(receipt, {
      partnerId: input.partnerId,
      policyId: input.policyId,
      allowSandbox: true,
      now,
    });
    replaySecondPass = second.currently_valid === sandboxTrust.currently_valid && second.currently_valid === true;
    observed = replaySecondPass ? "allow" : "deny";
  }

  if (scenario.id === "pii_absent") {
    observed = piiOk && sandboxTrust.currently_valid ? "allow" : "deny";
    if (!piiOk) reasons = ["pii_detected"];
  }

  const expectedAllow = scenario.expectedAccess === "allow_sandbox";
  const passed = expectedAllow ? observed === "allow" : observed === "deny";

  void sandboxValidation;

  return {
    scenario_id: scenario.id,
    simulated: false,
    passed,
    expected_access: scenario.expectedAccess,
    observed_access: observed,
    validity,
    invalidation_reasons: reasons,
    signature_valid: signatureValid,
    production_usable: productionUsable,
    callback_params: params,
    pii_scan_passed: piiOk,
    signing_source: source,
    replay_second_pass: replaySecondPass,
    verification_path: "evaluatePublicReceiptTrust+validatePartnerFlowPublicReceipt",
  };
}

export function harnessPassPublicCode(scenarioId: PartnerHarnessScenarioId): string {
  return `harness_${scenarioId}_pass`;
}

export function isHarnessPassCode(code: string | null | undefined): boolean {
  return Boolean(code && code.startsWith("harness_") && code.endsWith("_pass"));
}

export function harnessPassedFromActivity(
  events: Array<{ event_type: string; public_code: string | null; metadata?: Record<string, unknown> }>,
): { passed: boolean; completed: PartnerHarnessScenarioId[]; missing: PartnerHarnessScenarioId[] } {
  const completed = new Set<PartnerHarnessScenarioId>();
  for (const event of events) {
    const scenario = event.metadata?.scenario;
    if (event.public_code && isHarnessPassCode(event.public_code) && typeof scenario === "string") {
      if (REQUIRED_HARNESS_SCENARIOS.includes(scenario as PartnerHarnessScenarioId)) {
        completed.add(scenario as PartnerHarnessScenarioId);
      }
    }
  }
  const missing = REQUIRED_HARNESS_SCENARIOS.filter((id) => !completed.has(id));
  return { passed: missing.length === 0, completed: [...completed], missing };
}
