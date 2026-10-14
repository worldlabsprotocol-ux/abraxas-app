// FILE: lib/protocol/portableRevocation/checkpointAdvance.ts

import type { PortableRevocationCheckpoint } from "./contract";

export type PortableRevocationCheckpointContinuity = {
  previous_snapshot_hash: string | null;
  bootstrapped: boolean;
};

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
        | "corrupt_checkpoint"
        | "checkpoint_unavailable"
        | "chain_continuity_break"
        | "bootstrap_bypass_rejected";
      checkpoint: PortableRevocationCheckpoint | null;
    };

function validateCandidateShape(
  candidate: PortableRevocationCheckpoint,
  current: PortableRevocationCheckpoint | null,
): CompareAndAdvanceCheckpointResult | null {
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
  return null;
}

/** Continuity + monotonic rules — must run inside one checkpoint transaction. */
export function compareAndAdvanceCheckpointState(input: {
  current: PortableRevocationCheckpoint | null;
  candidate: PortableRevocationCheckpoint;
  continuity: PortableRevocationCheckpointContinuity;
}): CompareAndAdvanceCheckpointResult {
  const { current, candidate, continuity } = input;
  const invalid = validateCandidateShape(candidate, current);
  if (invalid) return invalid;

  const seq = candidate.highest_sequence;
  const bootstrapped = continuity.bootstrapped;

  if (!current) {
    if (!bootstrapped) {
      return { ok: false, code: "checkpoint_unavailable", checkpoint: null };
    }
    return { ok: true, advanced: true, checkpoint: candidate };
  }

  if (seq < current.highest_sequence) {
    return {
      ok: false,
      code: bootstrapped ? "bootstrap_bypass_rejected" : "rollback_rejected",
      checkpoint: current,
    };
  }

  if (seq === current.highest_sequence) {
    if (candidate.last_payload_hash === current.last_payload_hash) {
      return { ok: true, advanced: false, checkpoint: current };
    }
    return { ok: false, code: "hash_conflict_at_sequence", checkpoint: current };
  }

  if (seq === current.highest_sequence + 1) {
    if (continuity.previous_snapshot_hash !== current.last_payload_hash) {
      return { ok: false, code: "chain_continuity_break", checkpoint: current };
    }
    return { ok: true, advanced: true, checkpoint: candidate };
  }

  if (!bootstrapped) {
    return { ok: false, code: "chain_continuity_break", checkpoint: current };
  }

  return { ok: true, advanced: true, checkpoint: candidate };
}
