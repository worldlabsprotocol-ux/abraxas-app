// FILE: lib/assurance/ageProviders/eligibility.ts
// Issue reusable credentials from authoritative age-assurance results only.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import { createAgeEvidenceRecord } from "@/lib/assurance/ageEvidence";
import { ageBandSatisfiesThreshold } from "./registry";
import type { AgeBand, AgeThreshold, AuthoritativeAgeAssuranceResult } from "./types";

export function mapAgeBandToEligibilityOutcome(ageBand: AgeBand): string | null {
  if (ageBand === "over_21") return "over_21";
  if (ageBand === "over_18") return "over_18";
  return null;
}

export function isAuthoritativeAgeAssuranceResult(
  result: AuthoritativeAgeAssuranceResult,
  requestedThreshold: AgeThreshold,
): boolean {
  if (!result.verified) return false;
  if (!result.evidenceRefHash) return false;
  if (!ageBandSatisfiesThreshold(result.ageBand, requestedThreshold)) return false;
  if (result.ageBand === "unknown") return false;
  return true;
}

export async function issueCredentialFromAgeAssuranceResult(input: {
  subjectSuiAddress: string;
  providerId: string;
  result: AuthoritativeAgeAssuranceResult;
  requestedThreshold: AgeThreshold;
  partnerId: string;
  policyId: string;
  sessionId: string;
}): Promise<{ ok: true; jti: string } | { ok: false; error: string; code: string }> {
  if (!isAuthoritativeAgeAssuranceResult(input.result, input.requestedThreshold)) {
    return { ok: false, error: "authoritative_result_insufficient", code: "fail_closed" };
  }

  const outcome = mapAgeBandToEligibilityOutcome(input.result.ageBand);
  if (!outcome) {
    return { ok: false, error: "no_eligibility_outcome", code: "fail_closed" };
  }

  const normalized = normalizeSuiAddress(input.subjectSuiAddress);
  const issued = await issueManualIdentityCredential(normalized, {
    reviewId: `age-assurance:${input.sessionId}`,
    captureSessionId: input.sessionId,
    reviewer: `age_provider:${input.providerId}`,
    assuranceLevel: input.result.assuranceLevel === "L3" ? "L3" : "L2",
    reviewMethod: "automated_biometric",
    minimumAgeGate: input.requestedThreshold,
    authoritativeAgeBand: input.result.ageBand === "over_21" ? "over_21" : undefined,
    eligibilityEvidenceReference: input.result.evidenceRefHash,
  });

  if (!issued.ok || !issued.jti) {
    return { ok: false, error: issued.message ?? "issuance_failed", code: "issuance_failed" };
  }

  if (input.requestedThreshold >= 21) {
    await createAgeEvidenceRecord({
      subjectSuiAddress: normalized,
      captureSessionId: input.sessionId,
      evidenceProvider: "sandbox_pilot",
      evidenceType: "idv_vendor_age",
      assuranceLevel: input.result.assuranceLevel,
      ageThreshold: input.requestedThreshold,
      providerDecision: "eligible",
      reviewStatus: "approved",
      providerReference: input.result.evidenceRefHash,
      reviewerId: `age_provider:${input.providerId}`,
      reviewerReason: "authoritative_provider_result",
      reviewedAt: new Date().toISOString(),
      expiresAt: input.result.expiresAt ?? null,
      credentialJti: issued.jti,
    });
  }

  return { ok: true, jti: issued.jti };
}
