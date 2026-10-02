// FILE: lib/decisionReceipts/receiptSubjectPseudonym.ts
// Resolve signed receipt subject_pseudonym_id — global legacy or institutional pairwise.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveAbraxasSubjectFromClaimsKey } from "@/lib/identity/subject/subjectStore";
import {
  defaultPairwiseBoundary,
  pairwiseSubjectRef,
} from "@/lib/identity/pairwiseSubject/derive";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";

export type ReceiptSubjectPseudonymResult =
  | { ok: true; pseudonym: string; institutional: boolean }
  | { ok: false; code: "pairwise_key_missing" };

async function resolveApplicationIdFromDecision(
  verificationDecisionId: string,
): Promise<string | null> {
  const sb = requireSupabaseAdmin();
  const { data: decision } = await sb
    .from("verification_decisions")
    .select("request_id")
    .eq("id", verificationDecisionId)
    .maybeSingle();
  if (!decision?.request_id) return null;

  const { data: request } = await sb
    .from("verification_requests")
    .select("launchpad_application_id")
    .eq("id", decision.request_id as string)
    .maybeSingle();
  return (request?.launchpad_application_id as string | null) ?? null;
}

/**
 * Institutional provider-backed subjects receive a partner/application-bound pairwise
 * pseudonym signed into DecisionReceiptCanonicalPayload v1.0.0. Legacy wallet/OAuth
 * subjects keep the global subjectPseudonymId derivation unchanged.
 */
export async function resolveReceiptSubjectPseudonym(input: {
  claimsSubjectKey: string;
  partnerId: string;
  applicationId?: string | null;
  verificationDecisionId?: string;
}): Promise<ReceiptSubjectPseudonymResult> {
  const identitySubject = await resolveAbraxasSubjectFromClaimsKey(input.claimsSubjectKey);
  if (!identitySubject) {
    return {
      ok: true,
      pseudonym: subjectPseudonymId(input.claimsSubjectKey),
      institutional: false,
    };
  }

  let applicationId = input.applicationId ?? null;
  if (!applicationId && input.verificationDecisionId) {
    applicationId = await resolveApplicationIdFromDecision(input.verificationDecisionId);
  }

  const derived = pairwiseSubjectRef({
    abraxasSubjectId: identitySubject.id,
    boundary: defaultPairwiseBoundary(input.partnerId, applicationId),
  });
  if (!derived.ok) {
    return { ok: false, code: "pairwise_key_missing" };
  }

  return {
    ok: true,
    pseudonym: derived.ref,
    institutional: true,
  };
}

/** True when claims storage key maps to an institutional identity_subjects row. */
export async function isInstitutionalClaimsSubject(claimsSubjectKey: string): Promise<boolean> {
  const subject = await resolveAbraxasSubjectFromClaimsKey(claimsSubjectKey);
  return subject !== null;
}
