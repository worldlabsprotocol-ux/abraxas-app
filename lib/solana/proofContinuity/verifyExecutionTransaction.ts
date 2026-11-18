import {
  Connection,
  PublicKey,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import {
  EXECUTE_HARNESS_RUN_DISCRIMINATOR,
  REGISTER_SANDBOX_BINDING_DISCRIMINATOR,
} from "./instructionDiscriminator";
import { proofContinuityProgramId } from "./pda";
import { ED25519_PROGRAM_ID } from "./ed25519VerifyInstruction";

export type ExecutionTxExpectations = {
  holder: string;
  commitment: string;
  receiptIdHash: Buffer;
  payloadHash: Buffer;
  executionNonce: bigint;
  expiresAt: bigint;
  statusVersion: bigint;
  commitmentMessage: Buffer;
};

function buffersEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.equals(b);
}

function decodeExecuteHarnessRunData(data: Buffer):
  | {
      executionNonce: bigint;
      receiptIdHash: Buffer;
      payloadHash: Buffer;
      expiresAt: bigint;
      statusVersion: bigint;
    }
  | null {
  if (data.length < 8 + 8 + 32 + 32 + 8 + 8) return null;
  if (!data.subarray(0, 8).equals(EXECUTE_HARNESS_RUN_DISCRIMINATOR)) return null;
  let off = 8;
  const executionNonce = data.readBigUInt64LE(off);
  off += 8;
  const receiptIdHash = data.subarray(off, off + 32);
  off += 32;
  const payloadHash = data.subarray(off, off + 32);
  off += 32;
  const expiresAt = data.readBigInt64LE(off);
  off += 8;
  const statusVersion = data.readBigUInt64LE(off);
  return { executionNonce, receiptIdHash, payloadHash, expiresAt, statusVersion };
}

function ed25519InstructionMessage(data: Buffer): Buffer | null {
  if (data.length < 16) return null;
  const messageOffset = data.readUInt16LE(10);
  const messageLen = data.readUInt16LE(12);
  if (messageOffset + messageLen > data.length) return null;
  return data.subarray(messageOffset, messageOffset + messageLen);
}

function holderSignedTransaction(tx: VersionedTransactionResponse, holderPk: PublicKey): boolean {
  const message = tx.transaction.message;
  const keys = message.getAccountKeys().staticAccountKeys.slice(0, message.header.numRequiredSignatures);
  const holderIndex = keys.findIndex((pk) => pk.equals(holderPk));
  if (holderIndex < 0) return false;
  const signature = tx.transaction.signatures[holderIndex];
  if (!signature) return false;
  const bytes = typeof signature === "string"
    ? Buffer.from(signature, "base64")
    : Buffer.from(signature);
  return bytes.length > 0 && bytes.some((byte) => byte !== 0);
}

async function requireFinalizedSignature(
  connection: Connection,
  signature: string,
  finalitySlots: number,
): Promise<{ ok: true; slot: number } | { ok: false; reason: string }> {
  const status = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
  const value = status?.value?.[0];
  if (!value) return { ok: false, reason: "chain_transaction_not_found" };
  if (value.err) return { ok: false, reason: "chain_transaction_failed" };
  if (value.confirmationStatus !== "finalized") {
    return { ok: false, reason: "chain_transaction_not_finalized" };
  }
  const slot = value.slot ?? 0;
  const head = await connection.getSlot("finalized");
  if (head - slot < finalitySlots) return { ok: false, reason: "chain_finality_not_met" };
  return { ok: true, slot };
}

function collectInstructions(tx: VersionedTransactionResponse): Array<{ programId: PublicKey; data: Buffer; accountKeyIndexes: number[] }> {
  const message = tx.transaction.message;
  const keys = message.getAccountKeys().keySegments().flat();
  const compiled = message.compiledInstructions;
  return compiled.map((ix) => ({
    programId: keys[ix.programIdIndex]!,
    data: Buffer.from(ix.data),
    accountKeyIndexes: [...ix.accountKeyIndexes],
  }));
}

/** Proves a finalized transaction invoked proof-continuity with the expected harness run. */
export async function verifyExecutionTransaction(
  connection: Connection,
  signature: string,
  expected: ExecutionTxExpectations,
  finalitySlots: number,
): Promise<{ ok: true; slot: number } | { ok: false; reason: string }> {
  const finalized = await requireFinalizedSignature(connection, signature, finalitySlots);
  if (!finalized.ok) return finalized;

  const tx = await connection.getTransaction(signature, {
    commitment: "finalized",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return { ok: false, reason: "chain_transaction_not_found" };
  if (tx.meta?.err) return { ok: false, reason: "chain_transaction_failed" };

  const programId = proofContinuityProgramId();
  const holderPk = new PublicKey(expected.holder);
  const commitmentPk = new PublicKey(expected.commitment);
  if (!holderSignedTransaction(tx, holderPk)) {
    return { ok: false, reason: "chain_transaction_holder_not_signer" };
  }

  const instructions = collectInstructions(tx);
  const executeIndex = instructions.findIndex(
    (ix) => ix.programId.equals(programId) && ix.data.subarray(0, 8).equals(EXECUTE_HARNESS_RUN_DISCRIMINATOR),
  );
  if (executeIndex < 0) return { ok: false, reason: "chain_transaction_missing_execute_instruction" };

  const keys = tx.transaction.message.getAccountKeys().keySegments().flat();
  const executeIx = instructions[executeIndex]!;
  const decoded = decodeExecuteHarnessRunData(executeIx.data);
  if (!decoded) return { ok: false, reason: "chain_transaction_execute_decode_failed" };
  if (decoded.executionNonce !== expected.executionNonce) return { ok: false, reason: "chain_transaction_nonce_mismatch" };
  if (!buffersEqual(decoded.receiptIdHash, expected.receiptIdHash)) return { ok: false, reason: "chain_transaction_receipt_mismatch" };
  if (!buffersEqual(decoded.payloadHash, expected.payloadHash)) return { ok: false, reason: "chain_transaction_payload_mismatch" };
  if (decoded.expiresAt !== expected.expiresAt) return { ok: false, reason: "chain_transaction_expiry_mismatch" };
  if (decoded.statusVersion !== expected.statusVersion) return { ok: false, reason: "chain_transaction_version_mismatch" };

  const accountKeys = executeIx.accountKeyIndexes.map((i) => keys[i]!);
  if (!accountKeys.some((pk) => pk.equals(holderPk))) return { ok: false, reason: "chain_transaction_holder_missing" };
  if (!accountKeys.some((pk) => pk.equals(commitmentPk))) return { ok: false, reason: "chain_transaction_commitment_missing" };

  if (executeIndex === 0) return { ok: false, reason: "chain_transaction_missing_ed25519_instruction" };
  const prior = instructions[executeIndex - 1]!;
  if (!prior.programId.equals(ED25519_PROGRAM_ID)) {
    return { ok: false, reason: "chain_transaction_ed25519_not_adjacent" };
  }
  const issuerMessage = ed25519InstructionMessage(prior.data);
  if (!issuerMessage || !buffersEqual(issuerMessage, expected.commitmentMessage)) {
    return { ok: false, reason: "chain_transaction_issuer_message_mismatch" };
  }

  const unrelatedProofIx = instructions.some(
    (ix, index) => index !== executeIndex && ix.programId.equals(programId)
      && !ix.data.subarray(0, 8).equals(REGISTER_SANDBOX_BINDING_DISCRIMINATOR),
  );
  if (unrelatedProofIx) return { ok: false, reason: "chain_transaction_unrelated_proof_instruction" };

  return { ok: true, slot: finalized.slot };
}