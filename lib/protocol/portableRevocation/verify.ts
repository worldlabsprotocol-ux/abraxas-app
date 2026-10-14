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
  | "receipt_revoked"
  | "invalid_timestamp"
  | "snapshot_future_dated"
  | "invalid_freshness_bounds"
  | "invalid_expiry_window"
  | "invalid_sequence"
  | "duplicate_status_entry"
  | "stale_status_entry"
  | "status_entry_future_dated"
  | "invalid_status_entry"
  | "issuer_authority_mismatch"
  | "issuer_trust_unconfigured"
  | "snapshot_signing_key_unauthorized"
  | "checkpoint_unavailable"
  | "rollback_against_checkpoint"
  | "chain_continuity_break"
  | "hash_conflict_at_sequence"
  | "checkpoint_storage_unavailable"
  | "bootstrap_bypass_rejected";

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

  if (input.previousArtifact) {
    const prevSeq = input.previousArtifact.payload.snapshot_sequence;
    if (artifact.payload.snapshot_sequence <= prevSeq) {
      codes.push("sequence_rollback");
    }
    const prevHash = hashPortableRevocationPayload(input.previousArtifact.payload);
    if (artifact.payload.previous_snapshot_hash !== prevHash) {
      codes.push("previous_hash_mismatch");
    }
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
