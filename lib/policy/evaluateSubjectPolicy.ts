// FILE: lib/policy/evaluateSubjectPolicy.ts
// Unified policy evaluation with issuer trust context for a subject.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { assertPolicyBelongsToPartner } from "@/lib/policy/assertPolicyOwnership";
import { getPartnerPolicy, getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { resolveEffectivePolicyRules } from "@/lib/policy/resolveEffectivePolicyRules";
import { loadPolicyTrustContext } from "@/lib/trust/loadPolicyTrustContext";
import {
  expectedSelfAttestationPurpose,
  isSelfAttestationEligiblePolicy,
} from "@/lib/policy/selfAttestationGuards";
import { getActiveSelfAttestations } from "@/lib/assurance/selfAttestation/selfAttestationLedger";
import { ledgerRowsToClaims } from "@/lib/assurance/selfAttestation/selfAttestationClaims";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicy, PolicyEvaluationResult } from "@/lib/policy/types";
import { isContentOriginDisclosurePolicyId } from "@/lib/provenance/constants";
import { evaluateContentOriginDisclosure } from "@/lib/provenance/contentOriginDisclosure";
import { getActiveArtifactBinding } from "@/lib/provenance/artifactStore";
import {
  loadProvenanceSession,
  loadProvenanceSubmission,
} from "@/lib/provenance/provenanceSessionStore";

export interface SubjectPolicyEvaluation {
  policy: PartnerPolicy;
  evaluation: PolicyEvaluationResult;
  claims: CredentialClaimRecord[];
}

export async function evaluatePolicyForSubject(input: {
  suiAddress: string;
  policyId: string;
  partnerId: string;
  /** When set, evaluate against the pinned historical version (P1-1 reproducibility). */
  policyVersion?: number;
  /** Server-derived claims only. Never pass client, query, or cookie-decoded values. */
  additionalClaims?: CredentialClaimRecord[];
  /** Artifact hash for content provenance evaluation — server-derived only. */
  submittedContentHash?: string | null;
  verificationRequestId?: string | null;
}): Promise<SubjectPolicyEvaluation> {
  const policy = input.policyVersion != null
    ? await getPartnerPolicyAtVersion(input.policyId, input.policyVersion)
    : await getPartnerPolicy(input.policyId);
  if (!policy) throw new Error("Policy not found");
  assertPolicyBelongsToPartner(policy, input.partnerId);

  const subject = normalizeSuiAddress(input.suiAddress);
  const claims = await getActiveClaims(subject);

  const effectiveRules = resolveEffectivePolicyRules(policy);
  let mergedClaims = [...claims, ...(input.additionalClaims ?? [])];

  if (isSelfAttestationEligiblePolicy(effectiveRules)) {
    const rows = await getActiveSelfAttestations({
      holderRef: subject,
      partnerId: policy.partner_id,
      policyId: policy.id,
      purpose: expectedSelfAttestationPurpose(effectiveRules),
    });
    mergedClaims = [...mergedClaims, ...ledgerRowsToClaims(rows)];
  }

  const residency = mergedClaims.find(c => c.claim_type === "residency_country")?.claim_value?.country as string | undefined;
  const trustContext = await loadPolicyTrustContext({
    partnerId: input.partnerId,
    policyId: policy.id,
    jurisdiction: residency ?? claims.find(c => c.jurisdiction)?.jurisdiction,
  });

  let evaluation: PolicyEvaluationResult;
  if (isContentOriginDisclosurePolicyId(policy.id)) {
    const session = input.verificationRequestId
      ? await loadProvenanceSession(input.verificationRequestId)
      : null;
    const submittedContentHash = input.submittedContentHash
      ?? await loadProvenanceSubmission({ subjectId: subject, policyId: policy.id })
      ?? session?.expectedContentHash
      ?? null;

    if (!submittedContentHash) {
      evaluation = {
        decision: "denied",
        claims: {},
        reason_codes: ["artifact_hash_required"],
        valid_until: null,
        missing_claims: [
          "creator_attested",
          "ai_assistance_disclosed",
          "source_integrity_verified",
        ],
        decision_context: "sandbox_only",
        production_usable: false,
      };
    } else {
      const binding = await getActiveArtifactBinding({
        subjectId: subject,
        contentHash: submittedContentHash,
      });
      evaluation = evaluateContentOriginDisclosure({
        claims: mergedClaims,
        submittedContentHash,
        artifactBinding: binding,
        expectedContentHash: session?.expectedContentHash ?? submittedContentHash,
      });
    }
  } else {
    evaluation = evaluatePolicyRules(effectiveRules, mergedClaims, {
      jurisdiction: trustContext.jurisdiction,
      partnerId: input.partnerId,
      policyId: policy.id,
      policyRules: effectiveRules,
      trustRulesByClaimType: trustContext.trustRulesByClaimType,
    });
  }

  return { policy, evaluation, claims: mergedClaims };
}
