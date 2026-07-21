// FILE: lib/authenticationProof/reconstruct.ts
// Rebuild signed canonical payload from stored proof record.

import type { AuthenticationProofPayload, AuthenticationProofRecord } from "./types";
import { AUTH_PROOF_SCHEMA_VERSION } from "./types";

export function proofRecordToPayload(record: AuthenticationProofRecord): AuthenticationProofPayload {
  return {
    proof_id: record.id,
    schema_version: record.schema_version || AUTH_PROOF_SCHEMA_VERSION,
    event_type: record.event_type,
    record_id: record.record_id,
    payload_hash: record.payload_hash,
    issued_at: record.issued_at,
    network: record.network || record.sui_network || "devnet",
  };
}
