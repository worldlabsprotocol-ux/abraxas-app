// FILE: lib/protocol/portableRevocation/issuerAuthority.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

export type PortableRevocationIssuerBinding = {
  receipt_signing_key_id: string;
  revocation_issuer_id: string;
  snapshot_signing_key_ids: string[];
};

export type PortableRevocationIssuerTrustPolicy = {
  bindings: PortableRevocationIssuerBinding[];
};

export type AuthorizedRevocationIssuer =
  | {
      ok: true;
      revocation_issuer_id: string;
      snapshot_signing_key_ids: string[];
    }
  | { ok: false; code: "issuer_trust_unconfigured" | "receipt_signing_key_unbound" };

/** Locally trusted association: receipt signing key → revocation issuer + snapshot keys. */
export function resolveAuthorizedRevocationIssuerForReceipt(
  receipt: DecisionReceiptRecord,
  policy: PortableRevocationIssuerTrustPolicy,
): AuthorizedRevocationIssuer {
  if (!policy.bindings.length) {
    return { ok: false, code: "issuer_trust_unconfigured" };
  }
  const binding = policy.bindings.find(
    (row) => row.receipt_signing_key_id === receipt.signing_key_id,
  );
  if (!binding) {
    return { ok: false, code: "receipt_signing_key_unbound" };
  }
  return {
    ok: true,
    revocation_issuer_id: binding.revocation_issuer_id,
    snapshot_signing_key_ids: binding.snapshot_signing_key_ids,
  };
}

export function bootstrapTrustFromArtifact(input: {
  artifact: import("./contract").PortableRevocationSignedArtifact;
}): import("./contract").PortableRevocationBootstrapTrust {
  return {
    revocation_issuer_id: input.artifact.payload.issuer_id,
    snapshot_sequence: input.artifact.payload.snapshot_sequence,
    trusted_payload_hash: input.artifact.payload_hash,
    snapshot_signing_key_id: input.artifact.payload.signing_key_id,
  };
}
