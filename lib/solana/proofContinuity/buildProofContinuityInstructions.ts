import {
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  EXECUTE_HARNESS_RUN_DISCRIMINATOR,
  INITIALIZE_PROOF_REGISTRY_DISCRIMINATOR,
  REGISTER_SANDBOX_BINDING_DISCRIMINATOR,
} from "./instructionDiscriminator";
import {
  findExecutionLedgerPda,
  findProofRegistryPda,
  findReceiptCommitmentPda,
  findSandboxBindingPda,
  proofContinuityProgramId,
} from "./pda";
import { encodeCommitmentMessage, hashScopeId } from "./message";

export function buildInitializeProofRegistryInstruction(input: {
  admin: PublicKey;
  trustedIssuerPubkey32: Buffer;
  partnerId: string;
  policyId: string;
  applicationId: string;
}): TransactionInstruction {
  if (input.trustedIssuerPubkey32.length !== 32) {
    throw new Error("trusted_issuer_pubkey_invalid");
  }
  const registry = findProofRegistryPda(input.admin);
  const data = Buffer.alloc(8 + 32 + 32 + 32 + 32);
  INITIALIZE_PROOF_REGISTRY_DISCRIMINATOR.copy(data, 0);
  let off = 8;
  input.trustedIssuerPubkey32.copy(data, off);
  off += 32;
  hashScopeId(input.partnerId).copy(data, off);
  off += 32;
  hashScopeId(input.policyId).copy(data, off);
  off += 32;
  hashScopeId(input.applicationId).copy(data, off);
  return new TransactionInstruction({
    programId: proofContinuityProgramId(),
    keys: [
      { pubkey: input.admin, isSigner: true, isWritable: true },
      { pubkey: registry.address, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export type HarnessRunInstructionParams = {
  registryAdmin: PublicKey;
  holder: PublicKey;
  payer: PublicKey;
  receiptIdHash: Buffer;
  payloadHash: Buffer;
  partnerId: string;
  policyId: string;
  applicationId: string;
  expiresAt: bigint;
  executionNonce: bigint;
  statusVersion?: bigint;
};

export function buildRegisterSandboxBindingInstruction(input: {
  registryAdmin: PublicKey;
  holder: PublicKey;
}): TransactionInstruction {
  const registry = findProofRegistryPda(input.registryAdmin);
  const sandbox = findSandboxBindingPda(registry.address, input.holder);
  const data = Buffer.concat([REGISTER_SANDBOX_BINDING_DISCRIMINATOR]);
  return new TransactionInstruction({
    programId: proofContinuityProgramId(),
    keys: [
      { pubkey: input.holder, isSigner: true, isWritable: true },
      { pubkey: registry.address, isSigner: false, isWritable: false },
      { pubkey: sandbox.address, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildExecuteHarnessRunInstruction(params: HarnessRunInstructionParams): {
  instruction: TransactionInstruction;
  commitment: PublicKey;
  commitmentMessage: Buffer;
} {
  const registry = findProofRegistryPda(params.registryAdmin);
  const sandbox = findSandboxBindingPda(registry.address, params.holder);
  const ledger = findExecutionLedgerPda(sandbox.address);
  const commitment = findReceiptCommitmentPda(registry.address, params.receiptIdHash);
  const statusVersion = params.statusVersion ?? BigInt(1);
  const commitmentMessage = encodeCommitmentMessage({
    receipt_id_hash: params.receiptIdHash,
    payload_hash: params.payloadHash,
    partner_hash: hashScopeId(params.partnerId),
    policy_hash: hashScopeId(params.policyId),
    application_hash: hashScopeId(params.applicationId),
    expires_at: params.expiresAt,
    status_version: statusVersion,
    execution_nonce: params.executionNonce,
  });
  const data = Buffer.alloc(8 + 8 + 32 + 32 + 8 + 8);
  let off = 0;
  EXECUTE_HARNESS_RUN_DISCRIMINATOR.copy(data, off);
  off += 8;
  data.writeBigUInt64LE(params.executionNonce, off);
  off += 8;
  params.receiptIdHash.copy(data, off);
  off += 32;
  params.payloadHash.copy(data, off);
  off += 32;
  data.writeBigInt64LE(params.expiresAt, off);
  off += 8;
  data.writeBigUInt64LE(statusVersion, off);
  const instruction = new TransactionInstruction({
    programId: proofContinuityProgramId(),
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: params.holder, isSigner: true, isWritable: false },
      { pubkey: registry.address, isSigner: false, isWritable: false },
      { pubkey: sandbox.address, isSigner: false, isWritable: false },
      { pubkey: ledger.address, isSigner: false, isWritable: true },
      { pubkey: commitment.address, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  return { instruction, commitment: commitment.address, commitmentMessage };
}