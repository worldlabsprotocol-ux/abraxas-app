// FILE: lib/protocol/portableRevocation/checkpointAdvance.ts

import type { PortableRevocationCheckpoint } from "./contract";

export type CompareAndAdvanceCheckpointResult =
  | {
      ok: true;
      advanced: boolean;
      checkpoint: PortableRevocationCheckpoint;
    }
  | {
      ok: false;
      code:
        | "rollback_rejected"
        | "hash_conflict_at_sequence"
        | "storage_unavailable"
        | "corrupt_checkpoint";
      checkpoint: PortableRevocationCheckpoint | null;
    };

export function compareAndAdvanceCheckpointState(input: {
  current: PortableRevocationCheckpoint | null;
  candidate: PortableRevocationCheckpoint;
}): CompareAndAdvanceCheckpointResult {
  const { current, candidate } = input;
  if (candidate.revocation_issuer_id.trim().length === 0) {
    return { ok: false, code: "corrupt_checkpoint", checkpoint: current };
  }
  if (
    !Number.isInteger(candidate.highest_sequence)
    || candidate.highest_sequence < 1
    || candidate.last_payload_hash.length !== 64
  ) {
    return { ok: false, code: "corrupt_checkpoint", checkpoint: current };
  }

  if (!current) {
    return { ok: true, advanced: true, checkpoint: candidate };
  }

  if (candidate.highest_sequence < current.highest_sequence) {
    return { ok: false, code: "rollback_rejected", checkpoint: current };
  }

  if (candidate.highest_sequence === current.highest_sequence) {
    if (candidate.last_payload_hash === current.last_payload_hash) {
      return { ok: true, advanced: false, checkpoint: current };
    }
    return { ok: false, code: "hash_conflict_at_sequence", checkpoint: current };
  }

  return { ok: true, advanced: true, checkpoint: candidate };
}
