// FILE: lib/passport/reusableCredential/issuerBackedPresentationOrchestration.ts

import "server-only";

import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import type { HolderPossessionProof, PassportPossessionChallengePayload } from "./holderPossessionChallenge";
import type { SignedPassportReusableCredential } from "./contract";
import { resolvePresentationPartnerPolicy } from "./institutionalPresentationPolicy";
import { fetchPortableRevocationSnapshotForCredential } from "./serverPortableRevocationSnapshot";
import {
  loadConfiguredPortableRevocationBootstrapTrusts,
  openPortableRevocationCheckpointStore,
} from "./portableRevocationRuntime";
import { hashInstitutionalConsentBinding } from "./institutionalConsentBinding";
import { buildPresentationRequestDisclosure } from "./presentationDisclosure";
import { validateInstitutionalPresentationConsentDirect } from "@/lib/persistence/passportInstitutionalConsentDirect";
import {
  finalizeInstitutionalAuthorizationResourcesDirect,
  loadInstitutionalAuthorizationCommitDirect,
  persistInstitutionalAuthorizationOutcomeDirect,
} from "@/lib/persistence/passportInstitutionalAuthorizationAtomic";
import { authorizePartnerFromReusableCredential } from "./partnerAuthorization";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import type { InstitutionalPartnerCatalogEntry } from "./institutionalPartnerCatalog";
import { verifyPassportPossessionProofAsync } from "./holderPossessionChallenge";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { HolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";

export const PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV =
  "ABRAXAS_PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT";

export function buildInstitutionalAuthorizationIdempotencyKey(input: {
  credentialId: string;
  partnerId: string;
  requestId: string;
}): string {
  return `cred:${input.credentialId}:${input.partnerId}:${input.requestId}`;
}

export type IssuerBackedPresentationValidatedContext = {
  policyEntry: InstitutionalPartnerCatalogEntry;
  disclosureHash: string;
  portableRevocationSnapshot: PortableRevocationSignedArtifact;
  bootstrapTrusts: ReturnType<typeof loadConfiguredPortableRevocationBootstrapTrusts>;
};

export async function validateIssuerBackedPresentation(input: {
  credential: SignedPassportReusableCredential;
  holderSubjectId: string;
  partnerId: string;
  policyId: string;
  consentId: string;
  challenge: PassportPossessionChallengePayload;
  holderPossessionProof: HolderPossessionProof;
  skipConsentValidation?: boolean;
  skipPossessionValidation?: boolean;
  env?: Record<string, string | undefined>;
}): Promise<
  | { ok: true; context: IssuerBackedPresentationValidatedContext }
  | { ok: false; code: string; httpStatus: number; note?: string }
> {
  const env = input.env ?? (process.env as Record<string, string | undefined>);

  if (
    input.challenge.credential_id !== input.credential.payload.credential_id
    || input.challenge.partner_id !== input.partnerId
    || input.challenge.policy_id !== input.policyId
  ) {
    return { ok: false, code: "challenge_binding_mismatch", httpStatus: 400 };
  }

  const policy = await resolvePresentationPartnerPolicy({
    partnerId: input.partnerId,
    policyId: input.policyId,
    credential: input.credential,
    env,
  });
  if (!policy.ok) {
    return { ok: false, code: policy.code, httpStatus: 403 };
  }

  const disclosureHash = hashInstitutionalConsentBinding({
    holder_subject_id: input.holderSubjectId,
    credential_id: input.credential.payload.credential_id,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: policy.entry.policy_version,
    requested_attribute: policy.entry.requested_attribute,
  });

  if (!input.skipConsentValidation) {
    const consent = await validateInstitutionalPresentationConsentDirect({
      consentId: input.consentId,
      holderSubjectId: input.holderSubjectId,
      credentialId: input.credential.payload.credential_id,
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: policy.entry.policy_version,
      disclosureHash,
    });
    if (!consent.ok) {
      return { ok: false, code: consent.code, httpStatus: 403 };
    }
  }

  if (!input.skipPossessionValidation) {
    const possession = await verifyPassportPossessionProofAsync({
      credentialId: input.credential.payload.credential_id,
      partnerId: input.partnerId,
      policyId: input.policyId,
      credentialHolderPublicKey: input.credential.payload.holder_possession_public_key,
      challenge: input.challenge,
      proof: input.holderPossessionProof,
      validateOnly: true,
    });
    if (!possession.ok) {
      return { ok: false, code: possession.code, httpStatus: 400 };
    }
  }

  const snapshotResult = await fetchPortableRevocationSnapshotForCredential({
    credential: input.credential,
    env,
  });
  if (!snapshotResult.ok) {
    return {
      ok: false,
      code: snapshotResult.code,
      httpStatus: snapshotResult.httpStatus,
      note: snapshotResult.note,
    };
  }

  const checkpoint = await openPortableRevocationCheckpointStore(env);
  if (!checkpoint.ok) {
    return { ok: false, code: checkpoint.code, httpStatus: 503 };
  }

  const bootstrapTrusts = loadConfiguredPortableRevocationBootstrapTrusts(env);
  const { verifyPassportReusableCredentialStrict } = await import("./verify");
  const verified = await verifyPassportReusableCredentialStrict({
    credential: input.credential,
    env,
    portableRevocationSnapshot: snapshotResult.snapshot,
    checkpointStore: checkpoint.store,
    bootstrapTrusts,
  });
  if (!verified.ok) {
    return { ok: false, code: verified.code, httpStatus: 400, note: verified.detail?.join(",") };
  }

  const { materializeAuthenticatedClaimsForPolicy } = await import("./authenticatedClaims");
  const { evaluatePolicyRules } = await import("@/lib/policy/evaluatePolicy");
  const materialized = materializeAuthenticatedClaimsForPolicy({
    credential: input.credential,
    policyRules: policy.entry.policy_rules,
  });
  if (!materialized.ok) {
    return { ok: false, code: materialized.code, httpStatus: 400 };
  }
  const evaluation = evaluatePolicyRules(policy.entry.policy_rules, materialized.claims, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyRules: policy.entry.policy_rules,
  });
  if (evaluation.decision !== "approved") {
    return { ok: false, code: "policy_not_met", httpStatus: 403 };
  }

  return {
    ok: true,
    context: {
      policyEntry: policy.entry,
      disclosureHash,
      portableRevocationSnapshot: snapshotResult.snapshot,
      bootstrapTrusts,
    },
  };
}

export async function authorizeIssuerBackedPresentation(input: {
  credential: SignedPassportReusableCredential;
  holderSubjectId: string;
  partnerId: string;
  policyId: string;
  consentId: string;
  requestId: string;
  challenge: PassportPossessionChallengePayload;
  holderPossessionProof: HolderPossessionProof;
  receiptSigningKey: ReceiptSigningKeyPair;
  env?: Record<string, string | undefined>;
}) {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const idempotencyKey = buildInstitutionalAuthorizationIdempotencyKey({
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    requestId: input.requestId,
  });

  const existing = await loadInstitutionalAuthorizationCommitDirect(idempotencyKey);
  if (existing?.receipt_json && existing.presentation_json) {
    const receipt = JSON.parse(existing.receipt_json) as DecisionReceiptRecord;
    const presentation = JSON.parse(existing.presentation_json) as HolderPolicyScopedPresentation;
    return {
      ok: true as const,
      idempotent_recovery: true as const,
      authorized: {
        ok: true as const,
        receipt,
        presentation,
        policy_evaluation: { approved: true as const, reason_codes: receipt.reason_codes },
        idv_repeated: false as const,
        decision_context: receipt.decision_context,
      },
      disclosure: buildPresentationRequestDisclosure({
        credentialId: input.credential.payload.credential_id,
        partnerId: input.partnerId,
        partnerLabel: input.partnerId,
        policyId: input.policyId,
        requestedAttribute: "policy-scoped eligibility claims",
      }),
      portableRevocationSnapshot: null,
    };
  }

  const pendingCommit =
    existing && !existing.receipt_json
      ? existing
      : await loadInstitutionalAuthorizationCommitDirect(idempotencyKey);

  let validated:
    | { ok: true; context: IssuerBackedPresentationValidatedContext }
    | { ok: false; code: string; httpStatus: number; note?: string };

  if (pendingCommit && !pendingCommit.receipt_json) {
    if (pendingCommit.consent_id !== input.consentId) {
      return { ok: false as const, code: "consent_binding_mismatch", httpStatus: 403 };
    }
    validated = await validateIssuerBackedPresentation({
      credential: input.credential,
      holderSubjectId: input.holderSubjectId,
      partnerId: input.partnerId,
      policyId: input.policyId,
      consentId: input.consentId,
      challenge: input.challenge,
      holderPossessionProof: input.holderPossessionProof,
      env,
      skipConsentValidation: true,
      skipPossessionValidation: true,
    });
  } else {
    validated = await validateIssuerBackedPresentation({
      credential: input.credential,
      holderSubjectId: input.holderSubjectId,
      partnerId: input.partnerId,
      policyId: input.policyId,
      consentId: input.consentId,
      challenge: input.challenge,
      holderPossessionProof: input.holderPossessionProof,
      env,
    });
  }
  if (!validated.ok) {
    return validated;
  }

  if (pendingCommit?.receipt_json) {
    return {
      ok: true as const,
      idempotent_recovery: true as const,
      authorized: {
        ok: true as const,
        receipt: JSON.parse(pendingCommit.receipt_json) as DecisionReceiptRecord,
        presentation: JSON.parse(pendingCommit.presentation_json!) as HolderPolicyScopedPresentation,
        policy_evaluation: { approved: true as const, reason_codes: [] },
        idv_repeated: false as const,
        decision_context: "production",
      },
      disclosure: buildPresentationRequestDisclosure({
        credentialId: input.credential.payload.credential_id,
        partnerId: input.partnerId,
        partnerLabel: validated.context.policyEntry.partner_display_name,
        policyId: input.policyId,
        requestedAttribute: validated.context.policyEntry.requested_attribute,
      }),
      portableRevocationSnapshot: validated.context.portableRevocationSnapshot,
    };
  }

  const finalized =
    pendingCommit && !pendingCommit.receipt_json
      ? ({ ok: true as const, newlyCommitted: false as const, existing: pendingCommit } as const)
      : await finalizeInstitutionalAuthorizationResourcesDirect({
    idempotencyKey,
    holderSubjectId: input.holderSubjectId,
    consentId: input.consentId,
    challengeId: input.challenge.challenge_id,
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: validated.context.policyEntry.policy_version,
    disclosureHash: validated.context.disclosureHash,
    requestId: input.requestId,
        });
  if (!finalized.ok) {
    return { ok: false as const, code: finalized.code, httpStatus: 409 };
  }
  if (!finalized.newlyCommitted && finalized.existing?.receipt_json && finalized.existing.presentation_json) {
    const receipt = JSON.parse(finalized.existing.receipt_json) as DecisionReceiptRecord;
    const presentation = JSON.parse(finalized.existing.presentation_json) as HolderPolicyScopedPresentation;
    return {
      ok: true as const,
      idempotent_recovery: true as const,
      authorized: {
        ok: true as const,
        receipt,
        presentation,
        policy_evaluation: { approved: true as const, reason_codes: receipt.reason_codes },
        idv_repeated: false as const,
        decision_context: receipt.decision_context,
      },
      disclosure: buildPresentationRequestDisclosure({
        credentialId: input.credential.payload.credential_id,
        partnerId: input.partnerId,
        partnerLabel: validated.context.policyEntry.partner_display_name,
        policyId: input.policyId,
        requestedAttribute: validated.context.policyEntry.requested_attribute,
      }),
      portableRevocationSnapshot: validated.context.portableRevocationSnapshot,
    };
  }

  if (env[PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV] === "1") {
    return { ok: false as const, code: "authorization_signing_deferred", httpStatus: 503 };
  }

  const checkpoint = await openPortableRevocationCheckpointStore(env);
  if (!checkpoint.ok) {
    return { ok: false as const, code: checkpoint.code, httpStatus: 503 };
  }

  const { InMemoryPassportPossessionChallengeStore } = await import("./holderPossessionChallenge");
  const challengeStore = new InMemoryPassportPossessionChallengeStore();

  const authorized = await authorizePartnerFromReusableCredential({
    credential: input.credential,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: validated.context.policyEntry.policy_version,
    policyRules: validated.context.policyEntry.policy_rules,
    requestId: input.requestId,
    receiptSigningKey: input.receiptSigningKey,
    portableRevocationSnapshot: validated.context.portableRevocationSnapshot,
    possessionChallenge: input.challenge,
    holderPossessionProof: input.holderPossessionProof,
    checkpointStore: checkpoint.store,
    bootstrapTrusts: validated.context.bootstrapTrusts,
    consentReceiptId: input.consentId,
    possessionAlreadyCommitted: true,
    env,
    challengeStore,
  });

  if (!authorized.ok) {
    return { ok: false as const, code: authorized.code, httpStatus: 400 };
  }

  const persisted = await persistInstitutionalAuthorizationOutcomeDirect({
    idempotencyKey,
    receiptJson: JSON.stringify(authorized.receipt),
    presentationJson: JSON.stringify(authorized.presentation),
    committedAt: authorized.receipt.evaluated_at,
  });
  if (!persisted.ok) {
    return {
      ok: true as const,
      idempotent_recovery: false as const,
      signing_persist_deferred: true as const,
      authorized,
      disclosure: buildPresentationRequestDisclosure({
        credentialId: input.credential.payload.credential_id,
        partnerId: input.partnerId,
        partnerLabel: validated.context.policyEntry.partner_display_name,
        policyId: input.policyId,
        requestedAttribute: validated.context.policyEntry.requested_attribute,
      }),
      portableRevocationSnapshot: validated.context.portableRevocationSnapshot,
    };
  }

  const disclosure = buildPresentationRequestDisclosure({
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    partnerLabel: validated.context.policyEntry.partner_display_name,
    policyId: input.policyId,
    requestedAttribute: validated.context.policyEntry.requested_attribute,
  });

  return {
    ok: true as const,
    idempotent_recovery: false as const,
    authorized,
    disclosure,
    portableRevocationSnapshot: validated.context.portableRevocationSnapshot,
  };
}
