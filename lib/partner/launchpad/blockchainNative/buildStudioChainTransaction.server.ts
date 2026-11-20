import "server-only";

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import {
  buildEd25519VerifyInstruction,
  ed25519PublicKey32FromJwk,
  ed25519SecretKeyFromJwk,
} from "@/lib/solana/proofContinuity/ed25519VerifyInstruction";
import {
  buildExecuteHarnessRunInstruction,
  buildRegisterSandboxBindingInstruction,
} from "@/lib/solana/proofContinuity/buildProofContinuityInstructions";
import { decodeLastExecutionNonce } from "@/lib/solana/proofContinuity/decodeExecutionLedger";
import {
  findExecutionLedgerPda,
  findProofRegistryPda,
  findSandboxBindingPda,
} from "@/lib/solana/proofContinuity/pda";
import { hashReceiptId } from "@/lib/solana/proofContinuity/message";
import type { PrepareBindingPayload } from "./prepareBinding";

export type BuildStudioChainTransactionResult =
  | {
      ok: true;
      kind: "register_sandbox" | "execute_harness_run";
      transaction_base64: string;
      recent_blockhash: string;
      last_valid_block_height: number;
    }
  | { ok: false; code: string };

export async function readNextExecutionNonce(
  connection: Connection,
  registryAdmin: PublicKey,
  holder: PublicKey,
): Promise<bigint> {
  const registry = findProofRegistryPda(registryAdmin);
  const sandbox = findSandboxBindingPda(registry.address, holder);
  const ledger = findExecutionLedgerPda(sandbox.address);
  const info = await connection.getAccountInfo(ledger.address, { commitment: "finalized" });
  if (!info?.data) return BigInt(1);
  const last = decodeLastExecutionNonce(Buffer.from(info.data));
  return (last ?? BigInt(0)) + BigInt(1);
}

export async function buildStudioChainTransaction(input: {
  rpcUrl: string;
  registryAdmin: string;
  binding: PrepareBindingPayload;
  holderWallet: string;
}): Promise<BuildStudioChainTransactionResult> {
  const signingKey = loadReceiptSigningKey();
  if (!signingKey) return { ok: false, code: "authorized_issuer_key_required" };
  const issuerSecret = ed25519SecretKeyFromJwk(signingKey.privateKeyJwk);
  const issuerPub = ed25519PublicKey32FromJwk(signingKey.publicKeyJwk);
  if (!issuerSecret || !issuerPub) return { ok: false, code: "authorized_issuer_key_invalid" };

  let connection: Connection;
  let adminPk: PublicKey;
  let holderPk: PublicKey;
  try {
    connection = new Connection(input.rpcUrl, { commitment: "finalized" });
    adminPk = new PublicKey(input.registryAdmin);
    holderPk = new PublicKey(input.holderWallet);
  } catch {
    return { ok: false, code: "chain_pinned_keys_invalid" };
  }

  const registry = findProofRegistryPda(adminPk);
  const sandbox = findSandboxBindingPda(registry.address, holderPk);
  let sandboxInfo = await connection.getAccountInfo(sandbox.address, { commitment: "finalized" });
  if (!sandboxInfo) {
    sandboxInfo = await connection.getAccountInfo(sandbox.address, { commitment: "confirmed" });
  }
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: holderPk, recentBlockhash: blockhash });

  if (!sandboxInfo) {
    tx.add(buildRegisterSandboxBindingInstruction({ registryAdmin: adminPk, holder: holderPk }));
    return {
      ok: true,
      kind: "register_sandbox",
      transaction_base64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      recent_blockhash: blockhash,
      last_valid_block_height: lastValidBlockHeight,
    };
  }

  const receiptHash = hashReceiptId(input.binding.receipt_id);
  const payloadHash = Buffer.from(input.binding.payload_hash_hex, "hex");
  if (payloadHash.length !== 32) return { ok: false, code: "payload_hash_invalid" };
  const expiresAt = BigInt(Math.floor(Date.parse(input.binding.persistence.expires_at) / 1000));
  const executionNonce = BigInt(input.binding.execution_nonce);

  const built = buildExecuteHarnessRunInstruction({
    registryAdmin: adminPk,
    holder: holderPk,
    payer: holderPk,
    receiptIdHash: receiptHash,
    payloadHash,
    partnerId: input.binding.partner_id,
    policyId: input.binding.policy_id,
    applicationId: input.binding.application_id,
    expiresAt,
    executionNonce,
    statusVersion: BigInt(1),
  });
  tx.add(buildEd25519VerifyInstruction(issuerPub, issuerSecret, built.commitmentMessage));
  tx.add(built.instruction);

  return {
    ok: true,
    kind: "execute_harness_run",
    transaction_base64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    recent_blockhash: blockhash,
    last_valid_block_height: lastValidBlockHeight,
  };
}