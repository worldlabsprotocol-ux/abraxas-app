// FILE: lib/eligibilityPresentation/verify.ts

import { ELIGIBILITY_PRESENTATION_MEDIA_TYPE, ELIGIBILITY_PRESENTATION_VERSION } from "./contract";
import { nonceHash } from "./opaque";
import { presentationLeaks } from "./safety";
import { verifyPresentationSignature } from "./sign";
import {
  findPresentationByNonceHash,
  loadPresentation,
  consumePresentationIfIssued,
  savePresentationRequest,
  loadPresentationRequest,
} from "./store";
import type { EligibilityPresentationEnvelope } from "./types";
import { ORGANIZATION_RESULT_CATEGORIES } from "@/lib/organizationEligibility/contract";
import { requireLiveOrganizationEligibility } from "@/lib/organizationEligibility/revoke";
import { isSandboxInstitutionalProtocolAccessPolicyId } from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { operatorSandboxHolderBinding } from "@/lib/partner/sandboxInstitutionalOperatorResult/holderBinding";
import { loadSourceReceipt, receiptEnvironment, receiptHasFreshConsent } from "./sourceReceipt";

export interface PresentationVerifyExpected {
  audience_hash: string;
  verifier_nonce: string;
  policy_id: string;
  policy_version: number;
  action: string;
  environment: "sandbox" | "production";
}

export interface FetchedPublicReceipt {
  receipt_id: string;
  currently_valid: boolean;
  status?: string;
  decision_result?: string;
  policy_id?: string;
  policy_version?: number;
  partner_id?: string;
  withdrawn?: boolean;
  revoked?: boolean;
}

export type PresentationVerifyResult =
  | {
      ok: true;
      presentation_sufficient: false;
      receipt_refetch_required: true;
      payload: EligibilityPresentationEnvelope["payload"];
    }
  | { ok: false; reason: string; presentation_sufficient: false };

function asEnvelope(value: unknown): EligibilityPresentationEnvelope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.media_type !== ELIGIBILITY_PRESENTATION_MEDIA_TYPE) return null;
  if (typeof record.signature !== "string") return null;
  if (!record.payload || typeof record.payload !== "object") return null;
  return value as EligibilityPresentationEnvelope;
}

export async function verifyEligibilityPresentation(input: {
  envelope: unknown;
  expected: PresentationVerifyExpected;
  fetchReceipt: (receiptId: string) => Promise<FetchedPublicReceipt | null>;
}): Promise<PresentationVerifyResult> {
  if (presentationLeaks(input.envelope).length) {
    return { ok: false, reason: "redacted", presentation_sufficient: false };
  }
  const envelope = asEnvelope(input.envelope);
  if (!envelope) return { ok: false, reason: "invalid_envelope", presentation_sufficient: false };
  const payload = envelope.payload;
  if (payload.schema_version !== ELIGIBILITY_PRESENTATION_VERSION) {
    return { ok: false, reason: "schema_mismatch", presentation_sufficient: false };
  }
  const signature = verifyPresentationSignature(payload, envelope.signature);
  if (!signature.ok) return { ok: false, reason: signature.reason, presentation_sufficient: false };
  if (payload.audience_hash !== input.expected.audience_hash) {
    return { ok: false, reason: "audience_mismatch", presentation_sufficient: false };
  }
  if (payload.verifier_nonce !== input.expected.verifier_nonce) {
    return { ok: false, reason: "nonce_mismatch", presentation_sufficient: false };
  }
  if (payload.policy_id !== input.expected.policy_id || payload.policy_version !== input.expected.policy_version) {
    return { ok: false, reason: "policy_mismatch", presentation_sufficient: false };
  }
  if (payload.environment !== input.expected.environment) {
    return { ok: false, reason: "environment_mismatch", presentation_sufficient: false };
  }
  if (new Date(payload.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: "expired", presentation_sufficient: false };
  }

  const stored = await loadPresentation(payload.presentation_ref);
  if (!stored) return { ok: false, reason: "not_found", presentation_sufficient: false };
  if (stored.action !== input.expected.action) {
    return { ok: false, reason: "action_mismatch", presentation_sufficient: false };
  }
  if (stored.status === "revoked") return { ok: false, reason: "revoked", presentation_sufficient: false };
  if (stored.status === "consumed") return { ok: false, reason: "replayed", presentation_sufficient: false };
  if (stored.status !== "issued") return { ok: false, reason: stored.status, presentation_sufficient: false };

  const hash = nonceHash(input.expected.verifier_nonce);
  const byNonce = await findPresentationByNonceHash(hash);
  if (!byNonce || byNonce.presentation_ref !== stored.presentation_ref) {
    return { ok: false, reason: "nonce_mismatch", presentation_sufficient: false };
  }

  const receipt = await input.fetchReceipt(payload.receipt_verification_ref);
  if (!receipt) return { ok: false, reason: "receipt_refetch_failed", presentation_sufficient: false };
  if (receipt.withdrawn || receipt.revoked || receipt.status === "revoked") {
    return { ok: false, reason: "revoked", presentation_sufficient: false };
  }
  if (!receipt.currently_valid || receipt.decision_result !== "approved") {
    return { ok: false, reason: "receipt_invalid", presentation_sufficient: false };
  }
  if (receipt.policy_id && receipt.policy_id !== payload.policy_id) {
    return { ok: false, reason: "policy_mismatch", presentation_sufficient: false };
  }
  if ((ORGANIZATION_RESULT_CATEGORIES as readonly string[]).includes(stored.result_category)) {
    try {
      let subjectBinding: string | undefined;
      if (isSandboxInstitutionalProtocolAccessPolicyId(stored.policy_id)) {
        const source = await loadSourceReceipt(stored.receipt_verification_ref);
        if (!source || source.id !== receipt.receipt_id || source.partner_id !== receipt.partner_id
          || source.policy_id !== stored.policy_id || source.policy_version !== stored.policy_version
          || receiptEnvironment(source) !== stored.environment || !receiptHasFreshConsent(source)
          || source.status !== "active" || source.revoked_at) {
          return { ok: false, reason: "receipt_invalid", presentation_sufficient: false };
        }
        subjectBinding = operatorSandboxHolderBinding(source.partner_id, source.subject_pseudonym_id);
      }
      await requireLiveOrganizationEligibility({
        partnerId: receipt.partner_id,
        result_category: stored.result_category,
        policy_id: stored.policy_id,
        policy_version: stored.policy_version,
        action: stored.action,
        environment: stored.environment,
        subject_binding_hash: subjectBinding,
      });
    } catch (error) {
      const reason = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "organization_revoked";
      return { ok: false, reason, presentation_sufficient: false };
    }
  }

  const consumedAt = new Date().toISOString();
  const consumed = await consumePresentationIfIssued({
    presentationRef: stored.presentation_ref,
    nonceHash: hash,
    consumedAt,
  });
  if (!consumed) return { ok: false, reason: "replayed", presentation_sufficient: false };
  const request = await loadPresentationRequest(stored.request_ref);
  if (request) {
    await savePresentationRequest({ ...request, status: "consumed", consumed_at: consumedAt });
  }

  return {
    ok: true,
    presentation_sufficient: false,
    receipt_refetch_required: true,
    payload,
  };
}
