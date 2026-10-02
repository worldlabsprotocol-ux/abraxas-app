// FILE: lib/partner/externalActivation/firstProof.ts
// Deterministic sandbox first proof with persisted receipt + narrow-result support.

import { randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { buildEvaluatedClaimRefs } from "@/lib/decisionReceipts/claimRefs";
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
import { FIRST_PROOF_NOTICE } from "./contract";
import { firstProofSuccessCopy } from "./derive";

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
}

export interface SandboxFirstProofFailure {
  ok: false;
  code: string;
  detail: string;
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

function buildApprovedClaims(pack: PolicyPack | null, policyId: string): Record<string, unknown> {
  if (!pack) return { product_eligibility: true };
  if (pack.id === "content_origin_disclosure" || policyId.includes("content_origin")) {
    return {
      creator_attested: true,
      ai_assistance_disclosed: "none",
      source_integrity_verified: true,
    };
  }
  if (pack.disclosed_result === "age_eligible_21" || pack.disclosed_result === "age_eligible_18") {
    return {
      identity_verified: true,
      product_eligibility: true,
      liveness_passed: true,
      product_eligibility_required: true,
    };
  }
  if (policyPackIsEconomicDemo(pack)) {
    return {
      product_eligibility: true,
      sandbox_demo: true,
    };
  }
  return { product_eligibility: true };
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
      const narrow = await buildNarrowPartnerResultForReceipt(String(meta.receipt_id));
      return {
        ok: true,
        mode: "sandbox_first_proof",
        environment: "sandbox",
        sandbox_labeled: true,
        notice: FIRST_PROOF_NOTICE,
        request_id: String(meta.request_id),
        handoff_ref: String(meta.handoff_ref ?? ""),
        receipt_id: String(meta.receipt_id),
        callback_url: String(meta.callback_url),
        callback_params: {
          receipt_id: String(meta.receipt_id),
          decision: "approved",
          status: "active",
          request_id: String(meta.request_id),
        },
        verification_url: String(meta.verification_url ?? ""),
        narrow_result_preview: narrow ? sanitizeNarrowPreview(narrow) : null,
        success: firstProofSuccessCopy(app.policy_template_id),
        partner_must: "verifyCallbackWithNarrowResult",
        activates_production: false,
        duplicate: true,
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

  const pack = inferPolicyPackFromPolicyId(app.policy_id) ?? resolvePolicyPack(app.policy_template_id);
  const claims = buildApprovedClaims(pack, app.policy_id);
  const subjectId = `sandbox-first-proof:${app.id}:${randomBytes(4).toString("hex")}`;
  const validUntil = new Date(Date.now() + (pack?.receipt_lifetime_hours ?? 2) * 3600_000).toISOString();

  const { data: decisionRow, error: decisionError } = await sb.from("verification_decisions").insert({
    request_id: handoff.verify_request,
    partner_id: app.partner_id,
    subject_id: subjectId,
    policy_id: app.policy_id,
    policy_version: app.policy_version,
    decision: "approved",
    claims_json: claims,
    reason_codes: ["sandbox_first_proof"],
    valid_until: validUntil,
    status: "active",
    idempotency_key: idempotencyKey,
  }).select("id").single();

  if (decisionError?.code === "23505") {
    const replay = await sb.from("verification_decisions")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (!replay.data?.id) {
      return { ok: false, code: "decision_conflict", detail: "First proof decision conflict." };
    }
  } else if (!decisionRow?.id) {
    return { ok: false, code: "decision_failed", detail: "Could not persist sandbox verification decision." };
  }

  const decisionId = (decisionRow?.id ?? (await sb.from("verification_decisions")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle()).data?.id) as string;

  const claimRefs = buildEvaluatedClaimRefs([], Object.keys(claims));
  const receipt = await issueReceiptForDecision({
    decisionId,
    partnerId: app.partner_id,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    subjectId,
    decisionResult: "approved",
    reasonCodes: ["sandbox_first_proof"],
    claimsJson: claims,
    evaluatedClaimRefs: claimRefs.length ? claimRefs : [{
      claim_id: `first-proof-${app.id}`,
      claim_type: pack?.receipt_claim ?? "product_eligibility",
      issuer_id: "issuer:abraxas-sandbox",
      status: "active",
      issued_at: new Date().toISOString(),
      expires_at: validUntil,
    }],
    expiresAt: validUntil,
    decisionContext: "sandbox_only",
  });

  if (!receipt) {
    return { ok: false, code: "receipt_failed", detail: "Could not issue persisted sandbox receipt." };
  }

  await completeHostedHandoff({
    record: handoff,
    partnerId: app.partner_id,
    applicationId: app.id,
    publicReceiptId: receipt.id,
  });

  const callbackUrl = new URL(resolved.callback_url);
  callbackUrl.searchParams.set("receipt_id", receipt.id);
  callbackUrl.searchParams.set("decision", "approved");
  callbackUrl.searchParams.set("status", "active");
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
    policyVersion: app.policy_version,
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
    policyVersion: app.policy_version,
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
      verification_url: handoff.verify_request,
      sandbox_only: true,
      idempotency_key: idempotencyKey,
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
      decision: "approved",
      status: "active",
      request_id: handoff.verify_request,
    },
    verification_url: `/partner/continue?verify_request=${encodeURIComponent(handoff.verify_request)}`,
    narrow_result_preview: narrow ? sanitizeNarrowPreview(narrow) : null,
    success: firstProofSuccessCopy(app.policy_template_id),
    partner_must: "verifyCallbackWithNarrowResult",
    activates_production: false,
    duplicate: false,
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
