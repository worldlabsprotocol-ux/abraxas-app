// FILE: lib/authenticationProof/verifyProof.ts
// Independent authentication proof verification — no trust in Abraxas UI.

import { loadReceiptVerificationKey, getReceiptSigningKeyId } from "@/lib/decisionReceipts/signing";
import { getAuthenticationProof } from "./issue";
import { proofRecordToPayload } from "./reconstruct";
import { verifyAuthProofSignature } from "./signing";
import { proofStillReliable } from "./proofLifecycle";
import type { AuthenticationProofPayload, AuthenticationProofRecord, AnchorStatus, ProofLifecycleStatus } from "./types";

export interface SelfVerifiedAuthenticationProof {
  artifact_type: "authentication_proof";
  proof_id: string;
  payload: AuthenticationProofPayload;
  signature: string;
  signing_key_id: string;
  public_key: JsonWebKey | null;
  signature_valid: boolean;
  payload_hash: string;
  anchor_status: AnchorStatus;
  sui_network: string | null;
  sui_tx_digest: string | null;
  explorer_url: string | null;
  issued_at: string;
  event_type: AuthenticationProofRecord["event_type"];
  record_id: string;
  independently_verifiable: true;
  anchor_note: string;
  proof_status: ProofLifecycleStatus;
  proof_reliable: boolean;
  superseded_by: string | null;
  asset_abx_id: string | null;
}

const ANCHOR_NOTE_LIVE =
  "Full on-chain anchor requires Move package redeploy with anchor_authentication_proof and SUI_SPONSOR_SECRET_KEY.";

const ANCHOR_NOTE_SIGNED =
  "Cryptographically signed off-chain. Sui anchor pending package deploy or issuer configuration.";

const ANCHOR_NOTE_FAILED =
  "Anchor transaction attempted but failed — signature verification still valid if signature_valid is true.";

export function anchorStatusNote(status: AnchorStatus): string {
  if (status === "anchored") return ANCHOR_NOTE_LIVE;
  if (status === "anchor_failed") return ANCHOR_NOTE_FAILED;
  return ANCHOR_NOTE_SIGNED;
}

export function verifyAuthenticationProofRecord(
  record: AuthenticationProofRecord,
): Omit<SelfVerifiedAuthenticationProof, "artifact_type" | "independently_verifiable"> {
  const payload = proofRecordToPayload(record);
  const publicKey = loadReceiptVerificationKey();
  const signatureValid =
    record.signature !== "unsigned" &&
    record.signing_key_id !== "unsigned" &&
    Boolean(publicKey) &&
    verifyAuthProofSignature(payload, record.signature);

  return {
    proof_id: record.id,
    payload,
    signature: record.signature,
    signing_key_id: record.signing_key_id || getReceiptSigningKeyId(),
    public_key: publicKey,
    signature_valid: signatureValid,
    payload_hash: record.payload_hash,
    anchor_status: record.anchor_status,
    sui_network: record.sui_network,
    sui_tx_digest: record.sui_tx_digest,
    explorer_url: record.explorer_url,
    issued_at: record.issued_at,
    event_type: record.event_type,
    record_id: record.record_id,
    anchor_note: anchorStatusNote(record.anchor_status),
    proof_status: record.status,
    proof_reliable: proofStillReliable(record.status) && signatureValid,
    superseded_by: record.superseded_by,
    asset_abx_id: record.asset_abx_id,
  };
}

export async function getSelfVerifiedAuthenticationProof(
  proofId: string,
): Promise<SelfVerifiedAuthenticationProof | null> {
  const record = await getAuthenticationProof(proofId);
  if (!record) return null;

  const verified = verifyAuthenticationProofRecord(record);
  return {
    artifact_type: "authentication_proof",
    independently_verifiable: true,
    ...verified,
  };
}
