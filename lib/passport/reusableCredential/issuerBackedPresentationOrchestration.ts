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
  claimCanonicalAuthorizationSigningDirect,
  finalizeInstitutionalAuthorizationResourcesDirect,
  loadInstitutionalAuthorizationCommitDirect,
  persistCanonicalAuthorizationOutcomeDirect,
  type InstitutionalAuthorizationCommitRecord,
} from "@/lib/persistence/passportInstitutionalAuthorizationAtomic";
import { authorizePartnerFromReusableCredential } from "./partnerAuthorization";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import type { InstitutionalPartnerCatalogEntry } from "./institutionalPartnerCatalog";
import { verifyPassportPossessionProofAsync } from "./holderPossessionChallenge";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { HolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import {
  authorizationCommitBindingMatches,
  type AuthorizationCommitBindingInput,
} from "./authorizationCommitBinding";
import { deterministicAuthorizationReceiptIds } from "./institutionalAuthorizationReceiptIds";
import {
  recordInstitutionalConsentConsumedTelemetry,
  recordInstitutionalReceiptIssuedTelemetry,
} from "./institutionalPresentationObservability";

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

function disclosureFor(input: {
  credentialId: string;
  partnerId: string;
  partnerLabel: string;
  policyId: string;
  requestedAttribute: string;
}) {
  return buildPresentationRequestDisclosure({
    credentialId: input.credentialId,
    partnerId: input.partnerId,
    partnerLabel: input.partnerLabel,
    policyId: input.policyId,
    requestedAttribute: input.requestedAttribute,
  });
}

function authorizedFromStoredRecord(input: {
  receipt: DecisionReceiptRecord;
  presentation: HolderPolicyScopedPresentation;
}) {
  return {
    ok: true as const,
    receipt: input.receipt,
    presentation: input.presentation,
    policy_evaluation: { approved: true as const, reason_codes: input.receipt.reason_codes },
    idv_repeated: false as const,
    decision_context: input.receipt.decision_context,
  };
}

function successFromCanonicalCommit(input: {
  record: InstitutionalAuthorizationCommitRecord;
  binding: AuthorizationCommitBindingInput;
  idempotentRecovery: boolean;
  validated?: IssuerBackedPresentationValidatedContext;
}) {
  if (!authorizationCommitBindingMatches(input.record, input.binding)) {
    return { ok: false as const, code: "authorization_context_mismatch", httpStatus: 403 };
  }
  if (!input.record.receipt_json || !input.record.presentation_json) {
    return {
      ok: false as const,
      code: "authorization_outcome_pending",
      httpStatus: 503,
    };
  }
  const receipt = JSON.parse(input.record.receipt_json) as DecisionReceiptRecord;
  const presentation = JSON.parse(input.record.presentation_json) as HolderPolicyScopedPresentation;
  const partnerLabel =
    input.validated?.policyEntry.partner_display_name ?? input.record.partner_id;
  const requestedAttribute =
    input.validated?.policyEntry.requested_attribute ?? "policy-scoped eligibility claims";
  return {
    ok: true as const,
    idempotent_recovery: input.idempotentRecovery,
    authorized: authorizedFromStoredRecord({ receipt, presentation }),
    disclosure: disclosureFor({
      credentialId: input.binding.credentialId,
      partnerId: input.binding.partnerId,
      partnerLabel,
      policyId: input.binding.policyId,
      requestedAttribute,
    }),
    portableRevocationSnapshot: input.validated?.portableRevocationSnapshot ?? null,
  };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function institutionalPresentationEnvironment(
  policyEntry: InstitutionalPartnerCatalogEntry,
): "sandbox" | "production" {
  return policyEntry.policy_rules.sandbox_only ? "sandbox" : "production";
}

async function emitInstitutionalReceiptIssuedTelemetry(input: {
  validated: IssuerBackedPresentationValidatedContext;
  binding: AuthorizationCommitBindingInput;
  idempotencyKey: string;
  receiptId: string;
  idempotentRecovery: boolean;
  applicationId?: string | null;
}) {
  await recordInstitutionalReceiptIssuedTelemetry({
    partnerId: input.binding.partnerId,
    policyId: input.binding.policyId,
    policyVersion: input.validated.policyEntry.policy_version,
    environment: institutionalPresentationEnvironment(input.validated.policyEntry),
    requestId: input.binding.requestId,
    receiptId: input.receiptId,
    consentId: input.binding.consentId,
    authorizationIdempotencyKey: input.idempotencyKey,
    idempotentRecovery: input.idempotentRecovery,
    applicationId: input.applicationId ?? null,
  });
}

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

async function completeCanonicalSigning(input: {
  idempotencyKey: string;
  binding: AuthorizationCommitBindingInput;
  validated: IssuerBackedPresentationValidatedContext;
  credential: SignedPassportReusableCredential;
  receiptSigningKey: ReceiptSigningKeyPair;
  challenge: PassportPossessionChallengePayload;
  holderPossessionProof: HolderPossessionProof;
  consentId: string;
  env: Record<string, string | undefined>;
}) {
  if (input.env[PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV] === "1") {
    return { ok: false as const, code: "authorization_signing_deferred", httpStatus: 503 };
  }

  let claim = await claimCanonicalAuthorizationSigningDirect({ idempotencyKey: input.idempotencyKey });
  for (let attempt = 0; attempt < 8 && claim.ok && !claim.claimed; attempt++) {
    const loaded = claim.existing;
    if (loaded.receipt_json && loaded.presentation_json) {
      return successFromCanonicalCommit({
        record: loaded,
        binding: input.binding,
        idempotentRecovery: true,
        validated: input.validated,
      });
    }
    await sleep(40);
    claim = await claimCanonicalAuthorizationSigningDirect({ idempotencyKey: input.idempotencyKey });
  }
  if (!claim.ok) {
    return { ok: false as const, code: "authorization_outcome_pending", httpStatus: 503 };
  }
  if (!claim.claimed) {
    return successFromCanonicalCommit({
      record: claim.existing,
      binding: input.binding,
      idempotentRecovery: true,
      validated: input.validated,
    });
  }

  const checkpoint = await openPortableRevocationCheckpointStore(input.env);
  if (!checkpoint.ok) {
    return { ok: false as const, code: checkpoint.code, httpStatus: 503 };
  }

  const { InMemoryPassportPossessionChallengeStore } = await import("./holderPossessionChallenge");
  const deterministicReceiptIds = deterministicAuthorizationReceiptIds(input.idempotencyKey);

  const authorized = await authorizePartnerFromReusableCredential({
    credential: input.credential,
    partnerId: input.binding.partnerId,
    policyId: input.binding.policyId,
    policyVersion: input.validated.policyEntry.policy_version,
    policyRules: input.validated.policyEntry.policy_rules,
    requestId: input.binding.requestId,
    receiptSigningKey: input.receiptSigningKey,
    portableRevocationSnapshot: input.validated.portableRevocationSnapshot,
    possessionChallenge: input.challenge,
    holderPossessionProof: input.holderPossessionProof,
    checkpointStore: checkpoint.store,
    bootstrapTrusts: input.validated.bootstrapTrusts,
    consentReceiptId: input.consentId,
    possessionAlreadyCommitted: true,
    deterministicReceiptIds,
    env: input.env,
    challengeStore: new InMemoryPassportPossessionChallengeStore(),
  });

  if (!authorized.ok) {
    return { ok: false as const, code: authorized.code, httpStatus: 400 };
  }

  const persisted = await persistCanonicalAuthorizationOutcomeDirect({
    idempotencyKey: input.idempotencyKey,
    claimToken: claim.claimToken,
    receiptJson: JSON.stringify(authorized.receipt),
    presentationJson: JSON.stringify(authorized.presentation),
    committedAt: authorized.receipt.evaluated_at,
  });

  if (!persisted.ok) {
    return { ok: false as const, code: "authorization_outcome_pending", httpStatus: 503 };
  }
  if (!persisted.persisted) {
    return successFromCanonicalCommit({
      record: persisted.existing,
      binding: input.binding,
      idempotentRecovery: true,
      validated: input.validated,
    });
  }

  await emitInstitutionalReceiptIssuedTelemetry({
    validated: input.validated,
    binding: input.binding,
    idempotencyKey: input.idempotencyKey,
    receiptId: authorized.receipt.id,
    idempotentRecovery: false,
  });

  const stored = await loadInstitutionalAuthorizationCommitDirect(input.idempotencyKey);
  if (!stored?.receipt_json || !stored.presentation_json) {
    return { ok: false as const, code: "authorization_outcome_pending", httpStatus: 503 };
  }

  return successFromCanonicalCommit({
    record: stored,
    binding: input.binding,
    idempotentRecovery: false,
    validated: input.validated,
  });
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
  applicationId?: string | null;
  env?: Record<string, string | undefined>;
}) {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const idempotencyKey = buildInstitutionalAuthorizationIdempotencyKey({
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    requestId: input.requestId,
  });

  const binding: AuthorizationCommitBindingInput = {
    holderSubjectId: input.holderSubjectId,
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    consentId: input.consentId,
    challengeId: input.challenge.challenge_id,
    requestId: input.requestId,
  };

  const existing = await loadInstitutionalAuthorizationCommitDirect(idempotencyKey);
  if (existing?.receipt_json && existing.presentation_json) {
    return successFromCanonicalCommit({
      record: existing,
      binding,
      idempotentRecovery: true,
    });
  }

  const pendingCommit = existing && !existing.receipt_json ? existing : null;

  const validated = pendingCommit
    ? await validateIssuerBackedPresentation({
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
      })
    : await validateIssuerBackedPresentation({
        credential: input.credential,
        holderSubjectId: input.holderSubjectId,
        partnerId: input.partnerId,
        policyId: input.policyId,
        consentId: input.consentId,
        challenge: input.challenge,
        holderPossessionProof: input.holderPossessionProof,
        env,
      });

  if (!validated.ok) {
    return validated;
  }

  if (pendingCommit) {
    if (!authorizationCommitBindingMatches(pendingCommit, binding)) {
      return { ok: false as const, code: "authorization_context_mismatch", httpStatus: 403 };
    }
    return completeCanonicalSigning({
      idempotencyKey,
      binding,
      validated: validated.context,
      credential: input.credential,
      receiptSigningKey: input.receiptSigningKey,
      challenge: input.challenge,
      holderPossessionProof: input.holderPossessionProof,
      consentId: input.consentId,
      env,
    });
  }

  const finalized = await finalizeInstitutionalAuthorizationResourcesDirect({
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

  if (finalized.newlyCommitted) {
    await recordInstitutionalConsentConsumedTelemetry({
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: validated.context.policyEntry.policy_version,
      environment: institutionalPresentationEnvironment(validated.context.policyEntry),
      requestId: input.requestId,
      consentId: input.consentId,
      authorizationIdempotencyKey: idempotencyKey,
      applicationId: input.applicationId ?? null,
    });
  }

  if (
    !finalized.newlyCommitted
    && finalized.existing.receipt_json
    && finalized.existing.presentation_json
  ) {
    return successFromCanonicalCommit({
      record: finalized.existing,
      binding,
      idempotentRecovery: true,
      validated: validated.context,
    });
  }

  return completeCanonicalSigning({
    idempotencyKey,
    binding,
    validated: validated.context,
    credential: input.credential,
    receiptSigningKey: input.receiptSigningKey,
    challenge: input.challenge,
    holderPossessionProof: input.holderPossessionProof,
    consentId: input.consentId,
    env,
  });
}
