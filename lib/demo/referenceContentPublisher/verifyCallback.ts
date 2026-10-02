// FILE: lib/demo/referenceContentPublisher/verifyCallback.ts
// Server-side provenance callback verification — never trust query params alone.

import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProvenancePartnerFacts } from "@/lib/partner/provenancePartnerResult";
import { validateCallbackSearchParams } from "@/examples/partner-access-nextjs-starter/lib/callbackParams";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import { resolveReferencePublisherConfig } from "./config";
import { loadReferencePublisherDraft, updateReferencePublisherDraft } from "./sessionStore";

export interface ReferencePublisherVerifyResult {
  ok: boolean;
  published: boolean;
  errors: string[];
  provenance: ProvenancePartnerFacts | null;
  receipt_id: string | null;
}

async function loadProvenanceFactsFromReceipt(receiptId: string): Promise<ProvenancePartnerFacts | null> {
  const record = await getReceiptById(receiptId);
  if (!record || record.decision_result !== "approved") return null;

  const claimIds = record.evaluated_claim_refs.map((ref) => ref.claim_id).filter(Boolean);
  if (!claimIds.length) return null;

  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("credential_claims")
    .select("claim_type, claim_value")
    .in("id", claimIds);

  const claims = data ?? [];
  const aiClaim = claims.find((row) => row.claim_type === "ai_assistance_disclosed");
  const aiValue = aiClaim?.claim_value as { category?: string } | undefined;
  const category = typeof aiValue?.category === "string" ? aiValue.category : null;

  const hasCreator = claims.some((row) => row.claim_type === "creator_attested");
  const hasIntegrity = claims.some((row) => row.claim_type === "source_integrity_verified");

  if (!hasCreator || !hasIntegrity || !category) return null;

  return {
    creator_attested: true,
    ai_assistance_disclosed: category,
    source_integrity_verified: true,
    assertion_classes: {
      creator_attested: "attestation",
      ai_assistance_disclosed: "disclosure",
      source_integrity_verified: "integrity",
    },
  };
}

export async function verifyReferencePublisherCallback(input: {
  searchParams: URLSearchParams;
  origin?: string;
  fetchFn?: typeof fetch;
}): Promise<ReferencePublisherVerifyResult> {
  const config = resolveReferencePublisherConfig(input.origin);
  const publishAttemptId = input.searchParams.get("publish_attempt_id")?.trim() ?? "";
  const callbackValidation = validateCallbackSearchParams(input.searchParams);

  if (!publishAttemptId) {
    return { ok: false, published: false, errors: ["publish_attempt_missing"], provenance: null, receipt_id: null };
  }

  const draft = loadReferencePublisherDraft(publishAttemptId);
  if (!draft) {
    return { ok: false, published: false, errors: ["publish_attempt_unknown"], provenance: null, receipt_id: null };
  }

  if (input.searchParams.get("status") === "denied") {
    updateReferencePublisherDraft(publishAttemptId, {
      state: "proof_failed",
      failure_reason: "proof_denied",
    });
    return { ok: false, published: false, errors: ["proof_denied"], provenance: null, receipt_id: null };
  }

  if (!callbackValidation.ok || !callbackValidation.params?.receipt_id) {
    updateReferencePublisherDraft(publishAttemptId, {
      state: "proof_failed",
      failure_reason: callbackValidation.errors.join(","),
    });
    return {
      ok: false,
      published: false,
      errors: callbackValidation.errors,
      provenance: null,
      receipt_id: null,
    };
  }

  const receiptId = callbackValidation.params.receipt_id;
  const kit = new AbraxasPartnerKit({
    partnerId: config.partner_id,
    policyId: config.policy_id,
    policyVersion: 1,
    requirePolicyVersion: false,
    environment: "sandbox",
    policyPackId: config.pack_id,
    baseUrl: (input.origin ?? getPublicAppOrigin()).replace(/\/$/, ""),
    fetchFn: input.fetchFn,
  });

  const frozenParams = Object.fromEntries(
    Array.from(input.searchParams.entries()).filter(([key]) => (
      key === "status"
      || key === "decision_id"
      || key === "receipt_id"
      || key === "receipt_expires_at"
      || key === "credential_id"
      || key === "policy_id"
      || key === "partner_id"
    )),
  );
  const safe = await kit.verifyCallback(frozenParams);
  const fetched = await kit.fetchPublicReceipt(receiptId);
  const receipt = fetched.ok ? fetched.receipt : null;

  const validation = receipt
    ? validatePartnerFlowPublicReceipt(receipt, {
      partnerId: config.partner_id,
      policyId: config.policy_id,
      mode: "sandbox",
      allowSandbox: true,
    })
    : { ok: false, errors: safe.errors };

  const provenance = await loadProvenanceFactsFromReceipt(receiptId);
  const allowed = permitProtocolAction(safe) && validation.ok && Boolean(provenance);

  if (!allowed) {
    updateReferencePublisherDraft(publishAttemptId, {
      state: "proof_failed",
      failure_reason: [...safe.errors, ...validation.errors].join(","),
      receipt_id: receiptId,
    });
    return {
      ok: false,
      published: false,
      errors: [...safe.errors, ...validation.errors, ...(provenance ? [] : ["provenance_facts_missing"])],
      provenance,
      receipt_id: receiptId,
    };
  }

  updateReferencePublisherDraft(publishAttemptId, {
    state: "published",
    provenance: provenance!,
    receipt_id: receiptId,
    failure_reason: undefined,
  });

  return {
    ok: true,
    published: true,
    errors: [],
    provenance,
    receipt_id: receiptId,
  };
}
