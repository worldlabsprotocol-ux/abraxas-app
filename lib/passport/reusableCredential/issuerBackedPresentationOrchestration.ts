// FILE: lib/passport/reusableCredential/issuerBackedPresentationOrchestration.ts

import "server-only";

import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import type { HolderPossessionProof, PassportPossessionChallengePayload } from "./holderPossessionChallenge";
import type { SignedPassportReusableCredential } from "./contract";
import {
  resolvePresentationPartnerPolicy,
  type ResolvePresentationPartnerPolicyResult,
} from "./institutionalPresentationPolicy";
import { fetchPortableRevocationSnapshotForCredential } from "./serverPortableRevocationSnapshot";
import {
  loadConfiguredPortableRevocationBootstrapTrusts,
  openPortableRevocationCheckpointStore,
} from "./portableRevocationRuntime";
import { hashInstitutionalConsentBinding } from "./institutionalConsentBinding";
import { buildPresentationRequestDisclosure } from "./presentationDisclosure";
import { consumeInstitutionalPresentationConsentDirect } from "@/lib/persistence/passportInstitutionalConsentDirect";
import { authorizePartnerFromReusableCredential } from "./partnerAuthorization";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import type { InstitutionalPartnerCatalogEntry } from "./institutionalPartnerCatalog";

export type IssuerBackedPresentPreparationResult =
  | {
      ok: true;
      policyEntry: InstitutionalPartnerCatalogEntry;
      disclosureHash: string;
      portableRevocationSnapshot: PortableRevocationSignedArtifact;
      bootstrapTrusts: ReturnType<typeof loadConfiguredPortableRevocationBootstrapTrusts>;
    }
  | { ok: false; code: string; httpStatus: number; note?: string };

export async function prepareIssuerBackedPresentation(input: {
  credential: SignedPassportReusableCredential;
  holderSubjectId: string;
  partnerId: string;
  policyId: string;
  consentId: string;
  challenge: PassportPossessionChallengePayload;
  env?: Record<string, string | undefined>;
}): Promise<IssuerBackedPresentPreparationResult> {
  const env = input.env ?? (process.env as Record<string, string | undefined>);

  if (
    input.challenge.credential_id !== input.credential.payload.credential_id
    || input.challenge.partner_id !== input.partnerId
    || input.challenge.policy_id !== input.policyId
  ) {
    return { ok: false, code: "challenge_binding_mismatch", httpStatus: 400 };
  }

  const policy: ResolvePresentationPartnerPolicyResult = await resolvePresentationPartnerPolicy({
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

  const consent = await consumeInstitutionalPresentationConsentDirect({
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

  const bootstrapTrusts = loadConfiguredPortableRevocationBootstrapTrusts(env);

  return {
    ok: true,
    policyEntry: policy.entry,
    disclosureHash,
    portableRevocationSnapshot: snapshotResult.snapshot,
    bootstrapTrusts,
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
  durablePossessionConsume: (
    challengeId: string,
    at: string,
  ) => Promise<{ ok: true } | { ok: false; code: "unknown" | "expired" | "replay" }>;
  env?: Record<string, string | undefined>;
}) {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const prepared = await prepareIssuerBackedPresentation({
    credential: input.credential,
    holderSubjectId: input.holderSubjectId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    consentId: input.consentId,
    challenge: input.challenge,
    env,
  });
  if (!prepared.ok) {
    return prepared;
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
    policyVersion: prepared.policyEntry.policy_version,
    policyRules: prepared.policyEntry.policy_rules,
    requestId: input.requestId,
    receiptSigningKey: input.receiptSigningKey,
    portableRevocationSnapshot: prepared.portableRevocationSnapshot,
    possessionChallenge: input.challenge,
    holderPossessionProof: input.holderPossessionProof,
    checkpointStore: checkpoint.store,
    bootstrapTrusts: prepared.bootstrapTrusts,
    consentReceiptId: input.consentId,
    env,
    challengeStore,
    durablePossessionConsume: input.durablePossessionConsume,
  });

  if (!authorized.ok) {
    return { ok: false as const, code: authorized.code, httpStatus: 400 };
  }

  const disclosure = buildPresentationRequestDisclosure({
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    partnerLabel: prepared.policyEntry.partner_display_name,
    policyId: input.policyId,
    requestedAttribute: prepared.policyEntry.requested_attribute,
  });

  return {
    ok: true as const,
    authorized,
    disclosure,
    portableRevocationSnapshot: prepared.portableRevocationSnapshot,
  };
}
