// FILE: lib/protocol/portableRevocation/verify.ts

import { resolveVerificationKey } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { toPublicReceiptJwk } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";
import { hashPortableRevocationPayload } from "./canonical";
import {
  PORTABLE_REVOCATION_KEY_SCHEMA,
  PORTABLE_REVOCATION_MEDIA_TYPE,
  PORTABLE_REVOCATION_SCHEMA_VERSION,
  type PortableRevocationSignedArtifact,
} from "./contract";
import { verifyPortableRevocationSignature } from "./sign";
import { portableRevocationStatusId } from "./statusId";

export type PortableRevocationVerifyCode =
  | "invalid_media_type"
  | "invalid_schema"
  | "unknown_signing_key"
  | "signature_invalid"
  | "payload_hash_mismatch"
  | "snapshot_expired"
  | "snapshot_stale"
  | "sequence_rollback"
  | "previous_hash_mismatch"
  | "receipt_not_in_snapshot"
  | "receipt_revoked";

export type PortableRevocationVerification = {
  ok: boolean;
  codes: PortableRevocationVerifyCode[];
  snapshot_sequence: number | null;
  issuer_id: string | null;
};

export function verifyPortableRevocationArtifact(input: {
  artifact: PortableRevocationSignedArtifact;
  now?: Date;
  env?: Record<string, string | undefined>;
  previousArtifact?: PortableRevocationSignedArtifact;
}): PortableRevocationVerification {
  const codes: PortableRevocationVerifyCode[] = [];
  const now = input.now ?? new Date();
  const { artifact } = input;

  if (artifact.media_type !== PORTABLE_REVOCATION_MEDIA_TYPE) {
    codes.push("invalid_media_type");
  }
  if (artifact.payload.schema_version !== PORTABLE_REVOCATION_SCHEMA_VERSION) {
    codes.push("invalid_schema");
  }

  const recomputed = hashPortableRevocationPayload(artifact.payload);
  if (recomputed !== artifact.payload_hash) {
    codes.push("payload_hash_mismatch");
  }

  const keyResolved = resolveVerificationKey({
    keyId: artifact.payload.signing_key_id,
    schemaVersion: PORTABLE_REVOCATION_KEY_SCHEMA,
    now,
    env: input.env,
  });
  if (!keyResolved.ok) {
    codes.push("unknown_signing_key");
  } else {
    const pub = toPublicReceiptJwk(keyResolved.key.public_jwk);
    if (!pub || !verifyPortableRevocationSignature({ artifact, publicKeyJwk: pub })) {
      codes.push("signature_invalid");
    }
  }

  const issuedMs = Date.parse(artifact.payload.issued_at);
  const expiresMs = Date.parse(artifact.payload.expires_at);
  if (!Number.isNaN(expiresMs) && now.getTime() >= expiresMs) {
    codes.push("snapshot_expired");
  }
  if (!Number.isNaN(issuedMs)) {
    const ageSec = (now.getTime() - issuedMs) / 1000;
    if (ageSec > artifact.payload.max_freshness_seconds) {
      codes.push("snapshot_stale");
    }
  }

  if (input.previousArtifact) {
    const prevSeq = input.previousArtifact.payload.snapshot_sequence;
    if (artifact.payload.snapshot_sequence <= prevSeq) {
      codes.push("sequence_rollback");
    }
    const prevHash = hashPortableRevocationPayload(input.previousArtifact.payload);
    if (artifact.payload.previous_snapshot_hash !== prevHash) {
      codes.push("previous_hash_mismatch");
    }
  } else if (
    artifact.payload.snapshot_sequence > 1
    && artifact.payload.previous_snapshot_hash
  ) {
    codes.push("previous_hash_mismatch");
  }

  return {
    ok: codes.length === 0,
    codes,
    snapshot_sequence: artifact.payload.snapshot_sequence,
    issuer_id: artifact.payload.issuer_id,
  };
}

/** Map authenticated snapshot to independent verifier revocation source for one receipt. */
export function revocationSourceFromPortableSnapshot(input: {
  artifact: PortableRevocationSignedArtifact;
  receiptId: string;
  now?: Date;
  env?: Record<string, string | undefined>;
  previousArtifact?: PortableRevocationSignedArtifact;
}): RevocationSourceState & { verification: PortableRevocationVerification } {
  const verification = verifyPortableRevocationArtifact(input);
  if (!verification.ok) {
    return {
      available: false,
      reason: "unavailable",
      verification,
    };
  }

  const statusId = portableRevocationStatusId(input.receiptId, input.artifact.payload.issuer_id);
  const entry = input.artifact.payload.status_entries.find((e) => e.status_id === statusId);
  if (!entry) {
    return {
      available: false,
      reason: "unavailable",
      verification: {
        ...verification,
        ok: false,
        codes: [...verification.codes, "receipt_not_in_snapshot"],
      },
    };
  }
  if (entry.state === "revoked") {
    return {
      available: true,
      status: "revoked",
      verification: {
        ...verification,
        ok: false,
        codes: [...verification.codes, "receipt_revoked"],
      },
    };
  }
  return {
    available: true,
    status: "active",
    verification,
  };
}
