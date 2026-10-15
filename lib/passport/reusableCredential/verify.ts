// FILE: lib/passport/reusableCredential/verify.ts

import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { verifyPortableRevocationArtifact } from "@/lib/protocol/portableRevocation/verify";
import type { SignedPassportReusableCredential } from "./contract";
import { verifyPassportReusableCredentialSignature } from "./sign";

export type PassportCredentialVerifyFailure =
  | "invalid_signature"
  | "expired"
  | "revoked"
  | "holder_mismatch"
  | "unsupported_issuer"
  | "missing_revocation_snapshot";

export type PassportCredentialVerifyResult =
  | { ok: true }
  | { ok: false; code: PassportCredentialVerifyFailure };

export function verifyPassportReusableCredential(input: {
  credential: SignedPassportReusableCredential;
  issuerPublicKeyJwk: ReceiptSigningKeyPair["publicKeyJwk"];
  trustedIssuerIds: string[];
  holderSubjectId: string;
  now?: Date;
  portableRevocationSnapshot?: PortableRevocationSignedArtifact | null;
}): PassportCredentialVerifyResult {
  const { credential } = input;
  if (!verifyPassportReusableCredentialSignature(credential, input.issuerPublicKeyJwk)) {
    return { ok: false, code: "invalid_signature" };
  }
  if (!input.trustedIssuerIds.includes(credential.payload.issuer_id)) {
    return { ok: false, code: "unsupported_issuer" };
  }
  if (credential.payload.holder_subject_id !== input.holderSubjectId) {
    return { ok: false, code: "holder_mismatch" };
  }
  const now = input.now ?? new Date();
  if (Date.parse(credential.payload.expires_at) < now.getTime()) {
    return { ok: false, code: "expired" };
  }
  if (!input.portableRevocationSnapshot) {
    return { ok: false, code: "missing_revocation_snapshot" };
  }
  const crypto = verifyPortableRevocationArtifact({
    artifact: input.portableRevocationSnapshot,
    now,
  });
  if (!crypto.ok) {
    return { ok: false, code: "revoked" };
  }
  const activeEntry = input.portableRevocationSnapshot.payload.status_entries.find(
    (row) => row.status_id === credential.payload.revocation_status_id,
  );
  if (!activeEntry || activeEntry.state !== "active") {
    return { ok: false, code: "revoked" };
  }
  return { ok: true };
}
