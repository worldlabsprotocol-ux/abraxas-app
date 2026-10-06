// FILE: lib/demo/referenceContentPublisher/verifyCallback.ts
// Server-side provenance callback verification — never trust query params alone.

import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { ProvenancePartnerFacts } from "@/lib/partner/provenancePartnerResult";
import { validateCallbackSearchParams } from "@/examples/partner-access-nextjs-starter/lib/callbackParams";
import { PARTNER_CALLBACK_PARAMS } from "@/lib/protocol/compatibility";
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

export async function verifyReferencePublisherCallback(input: {
  searchParams: URLSearchParams;
  origin?: string;
  fetchFn?: typeof fetch;
}): Promise<ReferencePublisherVerifyResult> {
  const config = resolveReferencePublisherConfig(input.origin);
  const publishAttemptId = input.searchParams.get("publish_attempt_id")?.trim() ?? "";
  const abraxasCallbackParams = new URLSearchParams();
  for (const key of PARTNER_CALLBACK_PARAMS) {
    const value = input.searchParams.get(key);
    if (value != null) abraxasCallbackParams.set(key, value);
  }
  const callbackValidation = validateCallbackSearchParams(abraxasCallbackParams);

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

  const narrow = await kit.fetchNarrowPartnerResult(receiptId);
  const provenance = narrow.ok ? kit.extractProvenanceFromNarrowResult(narrow.result) : null;
  const narrowErrors = narrow.ok ? [] : narrow.errors;

  const allowed = permitProtocolAction(safe)
    && validation.ok
    && narrow.ok
    && narrow.result.decision === "approved"
    && Boolean(provenance);

  if (!allowed) {
    const errors = [
      ...safe.errors,
      ...validation.errors,
      ...narrowErrors,
      ...(provenance ? [] : ["provenance_facts_missing"]),
    ];
    updateReferencePublisherDraft(publishAttemptId, {
      state: "proof_failed",
      failure_reason: errors.join(","),
      receipt_id: receiptId,
    });
    return {
      ok: false,
      published: false,
      errors,
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
