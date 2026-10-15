// FILE: lib/passport/reusableCredential/credentialRevocationStrict.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import type {
  PortableRevocationBootstrapTrust,
  PortableRevocationCheckpointStore,
  PortableRevocationIssuerTrustPolicy,
  PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import { verifyPortableRevocationAtRelyingParty } from "@/lib/protocol/portableRevocation/rpVerify";
import type { SignedPassportReusableCredential } from "./contract";
import type { PassportCredentialIssuerRegistryEntry } from "./credentialIssuerRegistry";

export function credentialRevocationAnchorReceipt(
  credential: SignedPassportReusableCredential,
): DecisionReceiptRecord {
  const now = credential.payload.issued_at;
  return {
    id: credential.payload.credential_id,
    verification_decision_id: "00000000-0000-4000-8000-000000000566",
    consent_receipt_id: null,
    partner_id: "credential-revocation-anchor",
    policy_id: "credential-status",
    policy_version: 1,
    subject_pseudonym_id: "credential-anchor",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [credential.payload.issuer_id],
    decision_context: "sandbox_only",
    evaluated_at: now,
    expires_at: credential.payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: DECISION_RECEIPT_SCHEMA_VERSION,
    payload_hash: credential.payload_hash,
    signature: credential.signature,
    signing_key_id: credential.payload.signing_key_id,
    anchor_reference: null,
    idempotency_key: null,
    created_at: now,
  };
}

export function portableRevocationIssuerTrustForCredentialIssuer(
  entry: PassportCredentialIssuerRegistryEntry,
): PortableRevocationIssuerTrustPolicy {
  return {
    bindings: [
      {
        receipt_signing_key_id: entry.signing_key_id,
        revocation_issuer_id: entry.revocation_issuer_id,
        snapshot_signing_key_ids: entry.snapshot_signing_key_ids,
      },
    ],
  };
}

export async function verifyCredentialPortableRevocationStrict(input: {
  credential: SignedPassportReusableCredential;
  artifact: PortableRevocationSignedArtifact;
  registryEntry: PassportCredentialIssuerRegistryEntry;
  checkpointStore: PortableRevocationCheckpointStore;
  bootstrapTrusts?: PortableRevocationBootstrapTrust[];
  now?: Date;
  env?: Record<string, string | undefined>;
  advanceCheckpoint?: boolean;
}): Promise<{ ok: true } | { ok: false; code: string; codes?: string[] }> {
  const receipt = credentialRevocationAnchorReceipt(input.credential);
  const issuerTrust = portableRevocationIssuerTrustForCredentialIssuer(input.registryEntry);
  const result = await verifyPortableRevocationAtRelyingParty({
    artifact: input.artifact,
    receipt,
    now: input.now,
    env: input.env,
    issuerTrust,
    checkpointStore: input.checkpointStore,
    bootstrapTrusts: input.bootstrapTrusts,
    advanceCheckpointOnSuccess: input.advanceCheckpoint ?? true,
  });
  if (!result.verification.ok) {
    return {
      ok: false,
      code: "revocation_verification_failed",
      codes: result.verification.codes,
    };
  }
  if (result.revocationSource.available !== true || result.revocationSource.status !== "active") {
    return { ok: false, code: "credential_revoked_or_unknown" };
  }
  return { ok: true };
}
