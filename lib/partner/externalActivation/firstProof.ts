// FILE: lib/partner/externalActivation/firstProof.ts
// Deterministic sandbox first proof through canonical policy evaluation + receipt issuance.

import { createHash } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  issueReceiptForDecision,
  getPublicReceipt,
  getReceiptById,
} from "@/lib/decisionReceipts/service";
import {
  buildEvaluatedClaimRefs,
  claimTypesFromEvaluation,
} from "@/lib/decisionReceipts/claimRefs";
import { evaluateReceiptIntegrity } from "@/lib/decisionReceipts/receiptIntegrityDiagnostics";
import { createHostedHandoff, completeHostedHandoff } from "@/lib/partner/hostedHandoff";
import { loadPartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest";
import type { PartnerFlowAction } from "@/lib/partner/launchpad/partnerFlowRequest/contract";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import {
  inferPolicyPackFromPolicyId,
  policyPackIsEconomicDemo,
  resolvePolicyPack,
  type PolicyPack,
} from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { recordIntegrationEventBestEffort } from "@/lib/partner/integrationObservability/record";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";
import type { NarrowPartnerResult } from "@/lib/partner/narrowPartnerResult/contract";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { resolveIssuablePolicyForPartner } from "@/lib/policy/changeControl/lifecycle";
import { resolveReceiptDecisionContext } from "@/lib/partner/launchpad/productionActivation";
import { computeSessionReceiptExpiresAt } from "@/lib/partner/sessionReceipt";
import { FIRST_PROOF_NOTICE } from "./contract";
import { firstProofSuccessCopy } from "./derive";
import {
  assessDeterministicFirstProofEligibility,
  buildSandboxEconomicDemoEvidence,
} from "./firstProofEligibility";

export interface SandboxFirstProofResult {
  ok: true;
  mode: "sandbox_first_proof";
  environment: "sandbox";
  sandbox_labeled: true;
  notice: typeof FIRST_PROOF_NOTICE;
  request_id: string;
  handoff_ref: string;
  receipt_id: string;
  callback_url: string;
  callback_params: {
    receipt_id: string;
    decision: string;
    status: string;
    request_id: string;
  };
  verification_url: string;
  narrow_result_preview: Record<string, unknown> | null;
  success: ReturnType<typeof firstProofSuccessCopy>;
  partner_must: "verifyCallbackWithNarrowResult";
  activates_production: false;
  duplicate: boolean;
  policy_evaluation: {
    decision: string;
    reason_codes: string[];
    production_usable: boolean;
  };
}

export interface SandboxFirstProofFailure {
  ok: false;
  code: string;
  detail: string;
  reason_codes?: string[];
  remediation_href?: string;
}

function defaultActionForPack(pack: PolicyPack | null): PartnerFlowAction {
  if (!pack) return "retail_access";
  if (pack.id === "sandbox_economic_demo") return "sandbox_demo";
  if (pack.id === "content_origin_disclosure") return "retail_access";
  return "retail_access";
}

function resolveStoredConfig(
  app: LaunchpadApplicationRow,
  stored: PartnerFlowStoredConfig,
): PartnerFlowStoredConfig {
  const pack = resolvePolicyPack(app.policy_template_id);
  const callback = stored.callback_url ?? app.allowed_return_urls[0] ?? null;
  return {
    purpose: stored.purpose ?? pack?.disclosed_result ?? "verify_eligibility",
    action: stored.action ?? defaultActionForPack(pack),
    callback_url: callback,
    capabilities: stored.capabilities,
    display_label: stored.display_label ?? app.display_name,
  };
}

export function sandboxFirstProofSubjectId(applicationId: string): string {
  const digest = createHash("sha256").update(`sandbox-first-proof:${applicationId}`).digest("hex");
  return `0x${digest.slice(0, 64)}`;
}

function narrowSuccessCopy(
  policyTemplateId: string,
  narrow: NarrowPartnerResult | null,
): ReturnType<typeof firstProofSuccessCopy> {
  const base = firstProofSuccessCopy(policyTemplateId);
  if (!narrow || narrow.decision !== "approved") return base;
  const disclosed = narrow.result_family ?? base.returned.replace(/^Eligible: Yes \(/, "").replace(/\)$/, "");
  return {
    ...base,
    returned: `Eligible: Yes (${disclosed})`,
  };
}

async function verifyIssuedReceipt(input: {
  receiptId: string;
  partnerId: string;
  policyId: string;
  applicationId: string;
  requestId: string;
}): Promise<{ ok: true } | { ok: false; code: string; detail: string }> {
  const record = await getReceiptById(input.receiptId);
  if (!record) {
    return { ok: false, code: "receipt_not_found", detail: "Persisted receipt missing after issuance." };
  }

  const integrity = evaluateReceiptIntegrity(record);
  if (!integrity.payload_hash_matches_recomputed || !integrity.signature_valid) {
    return { ok: false, code: "receipt_invalid", detail: "Issued receipt failed cryptographic integrity checks." };
  }

  const publicView = await getPublicReceipt(input.receiptId);
  if (!publicView?.signature_valid || !publicView.currently_valid) {
    return { ok: false, code: "receipt_invalid", detail: "Public receipt verification failed." };
  }
  if (publicView.partner_id !== input.partnerId) {
    return { ok: false, code: "application_mismatch", detail: "Receipt partner binding mismatch." };
  }
  if (publicView.policy_id !== input.policyId) {
    return { ok: false, code: "policy_mismatch", detail: "Receipt policy binding mismatch." };
  }
  if (publicView.production_usable) {
    return { ok: false, code: "production_boundary", detail: "Sandbox first proof must not be production-usable." };
  }

  const narrow = await buildNarrowPartnerResultForReceipt(input.receiptId);
  if (!narrow || narrow.decision !== "approved") {
    return { ok: false, code: "result_denied", detail: "Canonical narrow result was not approved." };
  }

  await recordIntegrationEventBestEffort({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    environment: "sandbox",
    eventType: "receipt_verification_succeeded",
    lifecycleStage: "verification",
    outcome: "permitted",
    receiptId: input.receiptId,
    requestId: input.requestId,
    policyId: input.policyId,
    metadata: { public_code: "sandbox_first_proof" },
  });

  return { ok: true };
}

export async function runSandboxFirstProof(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  idempotencyKey?: string | null;
}): Promise<SandboxFirstProofResult | SandboxFirstProofFailure> {
  const app = input.application;
  if (app.environment !== "sandbox") {
    return { ok: false, code: "sandbox_only", detail: "First proof is available in sandbox only." };
  }
  if (!app.api_key_id) {
    return { ok: false, code: "credential_required", detail: "Issue a sandbox API key before first proof." };
  }
  if (!app.allowed_return_urls.length) {
    return { ok: false, code: "callback_required", detail: "Configure an allowlisted callback URL first." };
  }

  const eligibility = assessDeterministicFirstProofEligibility(app);
  if (!eligibility.ok) {
    return {
      ok: false,
      code: eligibility.code,
      detail: eligibility.detail,
      remediation_href: eligibility.remediation_href,
    };
  }

  const idempotencyKey = input.idempotencyKey?.trim()
    || `first-proof:${app.id}:${app.policy_version}`;

  const sb = requireSupabaseAdmin();
  const { data: prior } = await sb
    .from("partner_launchpad_activity")
    .select("metadata")
    .eq("application_id", app.id)
    .eq("partner_id", input.partnerId)
    .eq("public_code", "sandbox_first_proof_complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prior?.metadata && typeof prior.metadata === "object") {
    const meta = prior.metadata as Record<string, unknown>;
    if (meta.receipt_id && meta.request_id && meta.callback_url) {
      const receiptId = String(meta.receipt_id);
      const narrow = await buildNarrowPartnerResultForReceipt(receiptId);
      const record = await getReceiptById(receiptId);
      return {
        ok: true,
        mode: "sandbox_first_proof",
        environment: "sandbox",
        sandbox_labeled: true,
        notice: FIRST_PROOF_NOTICE,
        request_id: String(meta.request_id),
        handoff_ref: String(meta.handoff_ref ?? ""),
        receipt_id: receiptId,
        callback_url: String(meta.callback_url),
        callback_params: {
          receipt_id: receiptId,
          decision: record?.decision_result ?? "approved",
          status: record?.status ?? "active",
          request_id: String(meta.request_id),
        },
        verification_url: String(meta.verification_url ?? ""),
        narrow_result_preview: narrow ? sanitizeNarrowPreview(narrow) : null,
        success: narrowSuccessCopy(app.policy_template_id, narrow),
        partner_must: "verifyCallbackWithNarrowResult",
        activates_production: false,
        duplicate: true,
        policy_evaluation: {
          decision: record?.decision_result ?? "approved",
          reason_codes: record?.reason_codes ?? [],
          production_usable: false,
        },
      };
    }
  }

  let stored: PartnerFlowStoredConfig;
  try {
    stored = await loadPartnerFlowStoredConfig(app.id, input.partnerId, app.allowed_return_urls);
  } catch {
    return { ok: false, code: "unavailable", detail: "Could not load partner flow configuration." };
  }
  const resolved = resolveStoredConfig(app, stored);
  if (!resolved.callback_url || !resolved.action || !resolved.purpose) {
    return { ok: false, code: "callback_required", detail: "Partner flow purpose, action, and callback are required." };
  }

  let handoff;
  try {
    handoff = await createHostedHandoff({
      application: app,
      stored: resolved,
      runtime: "universal_https",
      fixture: false,
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "handoff_failed";
    return { ok: false, code, detail: "Could not create hosted handoff for first proof." };
  }

  const subjectId = sandboxFirstProofSubjectId(app.id);
  const issuable = await resolveIssuablePolicyForPartner({
    policyId: app.policy_id,
    partnerId: app.partner_id,
    expectedVersion: app.policy_version,
  });

  const additionalClaims = buildSandboxEconomicDemoEvidence({
    verifyRequestId: handoff.verify_request,
    partnerId: app.partner_id,
    policyId: app.policy_id,
    policyVersion: issuable.version,
    subjectId,
  });

  if (!additionalClaims.length) {
    return {
      ok: false,
      code: "sandbox_evidence_unavailable",
      detail: "Could not derive sandbox qualification evidence for this verification request.",
    };
  }

  let evaluation;
  try {
    const evaluated = await evaluatePolicyForSubject({
      suiAddress: subjectId,
      policyId: app.policy_id,
      partnerId: app.partner_id,
      policyVersion: issuable.version,
      additionalClaims,
      verificationRequestId: handoff.verify_request,
    });
    evaluation = evaluated.evaluation;
  } catch {
    return { ok: false, code: "policy_evaluation_failed", detail: "Canonical policy evaluation failed." };
  }

  if (evaluation.decision !== "approved") {
    return {
      ok: false,
      code: "policy_not_satisfied",
      detail: "Deterministic sandbox evidence did not satisfy the selected policy.",
      reason_codes: evaluation.reason_codes,
    };
  }

  const sessionExpires = computeSessionReceiptExpiresAt(eligibility.pack.rules);
  const validUntil = evaluation.valid_until ?? sessionExpires;

  const decisionInsertBase = {
    request_id: handoff.verify_request,
    partner_id: app.partner_id,
    subject_id: subjectId,
    policy_id: app.policy_id,
    policy_version: issuable.version,
    decision: evaluation.decision,
    claims_json: evaluation.claims,
    reason_codes: evaluation.reason_codes,
    valid_until: validUntil,
    status: "active",
    idempotency_key: idempotencyKey,
  };

  let decisionId: string | undefined;
  const { data: decisionRow, error: decisionError } = await sb
    .from("verification_decisions")
    .insert(decisionInsertBase)
    .select("id")
    .single();

  if (decisionError?.code === "23505") {
    const replay = await sb
      .from("verification_decisions")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    decisionId = replay.data?.id as string | undefined;
    if (!decisionId) {
      return { ok: false, code: "decision_conflict", detail: "First proof decision conflict." };
    }
  } else if (!decisionRow?.id) {
    return { ok: false, code: "decision_failed", detail: "Could not persist sandbox verification decision." };
  } else {
    decisionId = decisionRow.id as string;
  }

  const claimTypes = claimTypesFromEvaluation(evaluation.claims);
  const evaluatedClaimRefs = buildEvaluatedClaimRefs(additionalClaims, claimTypes);

  const decisionContext = await resolveReceiptDecisionContext({
    policySandboxOnly: Boolean(eligibility.pack.rules.sandbox_only),
    launchpadApplicationId: app.id,
  });

  const receipt = await issueReceiptForDecision({
    decisionId,
    partnerId: app.partner_id,
    policyId: app.policy_id,
    policyVersion: issuable.version,
    subjectId,
    decisionResult: evaluation.decision,
    reasonCodes: evaluation.reason_codes,
    claimsJson: evaluation.claims,
    evaluatedClaimRefs,
    expiresAt: validUntil,
    decisionContext,
  });

  if (!receipt) {
    return { ok: false, code: "receipt_failed", detail: "Could not issue persisted sandbox receipt." };
  }

  const verified = await verifyIssuedReceipt({
    receiptId: receipt.id,
    partnerId: app.partner_id,
    policyId: app.policy_id,
    applicationId: app.id,
    requestId: handoff.verify_request,
  });
  if (!verified.ok) {
    return verified;
  }

  await completeHostedHandoff({
    record: handoff,
    partnerId: app.partner_id,
    applicationId: app.id,
    publicReceiptId: receipt.id,
  });

  const callbackUrl = new URL(resolved.callback_url);
  callbackUrl.searchParams.set("receipt_id", receipt.id);
  callbackUrl.searchParams.set("decision", evaluation.decision);
  callbackUrl.searchParams.set("status", receipt.status);
  callbackUrl.searchParams.set("request_id", handoff.verify_request);

  const narrow = await buildNarrowPartnerResultForReceipt(receipt.id);

  await recordIntegrationEventBestEffort({
    partnerId: app.partner_id,
    applicationId: app.id,
    environment: "sandbox",
    eventType: "hosted_handoff_created",
    lifecycleStage: "request",
    requestId: handoff.verify_request,
    handoffRef: handoff.handoff_ref,
    policyId: app.policy_id,
    policyVersion: issuable.version,
    metadata: { public_code: "sandbox_first_proof" },
  });
  await recordIntegrationEventBestEffort({
    partnerId: app.partner_id,
    applicationId: app.id,
    environment: "sandbox",
    eventType: "receipt_issued",
    lifecycleStage: "receipt",
    receiptId: receipt.id,
    requestId: handoff.verify_request,
    policyId: app.policy_id,
    policyVersion: issuable.version,
    metadata: { public_code: "sandbox_first_proof" },
  });

  await recordLaunchpadActivity(sb, {
    applicationId: app.id,
    partnerId: input.partnerId,
    eventType: "receipt_issued",
    publicCode: "sandbox_first_proof_complete",
    metadata: {
      receipt_id: receipt.id,
      request_id: handoff.verify_request,
      handoff_ref: handoff.handoff_ref,
      callback_url: callbackUrl.toString(),
      verification_url: `/partner/continue?verify_request=${encodeURIComponent(handoff.verify_request)}`,
      sandbox_only: true,
      idempotency_key: idempotencyKey,
      policy_evaluation_decision: evaluation.decision,
    },
  });

  return {
    ok: true,
    mode: "sandbox_first_proof",
    environment: "sandbox",
    sandbox_labeled: true,
    notice: FIRST_PROOF_NOTICE,
    request_id: handoff.verify_request,
    handoff_ref: handoff.handoff_ref,
    receipt_id: receipt.id,
    callback_url: callbackUrl.toString(),
    callback_params: {
      receipt_id: receipt.id,
      decision: evaluation.decision,
      status: receipt.status,
      request_id: handoff.verify_request,
    },
    verification_url: `/partner/continue?verify_request=${encodeURIComponent(handoff.verify_request)}`,
    narrow_result_preview: narrow ? sanitizeNarrowPreview(narrow) : null,
    success: narrowSuccessCopy(app.policy_template_id, narrow),
    partner_must: "verifyCallbackWithNarrowResult",
    activates_production: false,
    duplicate: false,
    policy_evaluation: {
      decision: evaluation.decision,
      reason_codes: evaluation.reason_codes,
      production_usable: evaluation.production_usable ?? false,
    },
  };
}

function sanitizeNarrowPreview(narrow: NarrowPartnerResult): Record<string, unknown> {
  const allowed = [
    "schema_version",
    "receipt_id",
    "partner_id",
    "policy_id",
    "decision",
    "result_family",
    "over_21",
    "identity_verified",
    "assurance_level",
    "provenance",
  ];
  const out: Record<string, unknown> = {};
  const source = narrow as unknown as Record<string, unknown>;
  for (const key of allowed) {
    if (key in source) out[key] = source[key];
  }
  return out;
}
