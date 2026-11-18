import { Keypair, PublicKey } from "@solana/web3.js";
import { PROOF_CONTINUITY_REGISTRY_DISCRIMINATOR, RECEIPT_COMMITMENT_DISCRIMINATOR } from "./anchorDiscriminator";
import { PROOF_CONTINUITY_PROGRAM_ID, RECEIPT_COMMITMENT_STATUS } from "./constants";
import { RECEIPT_COMMITMENT_ACCOUNT_SIZE } from "./decodeCommitment";
import { PROOF_REGISTRY_ACCOUNT_SIZE } from "./decodeRegistry";
import { findProofRegistryPda, findReceiptCommitmentPda, proofContinuityProgramId } from "./pda";
import { hashReceiptId, hashScopeId } from "./message";
import type { CommitmentChainEvidence } from "./solanaAccountEvidence";

/** Test-only authenticated account bytes (Anchor LE layout). Not for production adapter. */
export function buildTestCommitmentChainEvidence(fields: {
  registryAdmin: Keypair;
  trustedIssuerPubkey: Uint8Array;
  partner_id: string;
  policy_id: string;
  application_id: string;
  receipt_id: string;
  payload_hash_hex: string;
  expires_at?: number;
  status_version?: bigint;
}): CommitmentChainEvidence {
  const admin = fields.registryAdmin.publicKey;
  const { address: registryAddress, bump: registryBump } = findProofRegistryPda(admin);
  const receiptHash = hashReceiptId(fields.receipt_id);
  const { address: commitmentAddress, bump: commitmentBump } = findReceiptCommitmentPda(
    registryAddress,
    receiptHash,
  );

  const registryBuf = Buffer.alloc(PROOF_REGISTRY_ACCOUNT_SIZE, 0);
  PROOF_CONTINUITY_REGISTRY_DISCRIMINATOR.copy(registryBuf, 0);
  let off = 8;
  admin.toBuffer().copy(registryBuf, off);
  off += 32;
  Buffer.from(fields.trustedIssuerPubkey).copy(registryBuf, off);
  off += 32;
  hashScopeId(fields.partner_id).copy(registryBuf, off);
  off += 32;
  hashScopeId(fields.policy_id).copy(registryBuf, off);
  off += 32;
  hashScopeId(fields.application_id).copy(registryBuf, off);
  off += 32;
  registryBuf.writeBigUInt64LE(BigInt(1), off);
  off += 8;
  registryBuf.writeUInt8(registryBump, off);

  const commitmentBuf = Buffer.alloc(RECEIPT_COMMITMENT_ACCOUNT_SIZE, 0);
  RECEIPT_COMMITMENT_DISCRIMINATOR.copy(commitmentBuf, 0);
  off = 8;
  registryAddress.toBuffer().copy(commitmentBuf, off);
  off += 32;
  receiptHash.copy(commitmentBuf, off);
  off += 32;
  Buffer.from(fields.payload_hash_hex.replace(/^0x/, ""), "hex").copy(commitmentBuf, off);
  off += 32;
  hashScopeId(fields.partner_id).copy(commitmentBuf, off);
  off += 32;
  hashScopeId(fields.policy_id).copy(commitmentBuf, off);
  off += 32;
  hashScopeId(fields.application_id).copy(commitmentBuf, off);
  off += 32;
  const expires = fields.expires_at ?? 9_000_000_000;
  commitmentBuf.writeBigInt64LE(BigInt(expires), off);
  off += 8;
  commitmentBuf.writeUInt8(RECEIPT_COMMITMENT_STATUS.active, off);
  off += 1;
  commitmentBuf.writeBigUInt64LE(fields.status_version ?? BigInt(1), off);
  off += 8;
  commitmentBuf.writeUInt8(commitmentBump, off);

  const programId = proofContinuityProgramId().toBase58();
  return {
    programId: PROOF_CONTINUITY_PROGRAM_ID,
    registryAdmin: admin.toBase58(),
    receiptIdHash: receiptHash,
    commitment: {
      address: commitmentAddress.toBase58(),
      owner: programId,
      data: commitmentBuf,
    },
    registry: {
      address: registryAddress.toBase58(),
      owner: programId,
      data: registryBuf,
    },
  };
}

export function testIssuerKeypair(): Keypair {
  return Keypair.generate();
}

export function trustedIssuerBytesFromKeypair(kp: Keypair): Uint8Array {
  return kp.publicKey.toBytes();
}