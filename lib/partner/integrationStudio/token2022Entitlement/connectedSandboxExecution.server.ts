import "server-only";

import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  buildConsumeVerifiedEntitlementInstruction,
  buildMintVerifiedEntitlementInstruction,
  resolveEntitlementPublicAccounts,
} from "@/lib/solana/token2022Entitlement/buildEntitlementInstructions";
import { hashReceiptId, hashScopeId } from "@/lib/solana/proofContinuity/message";
import {
  commitmentIsCurrentlyAcceptable,
  decodeReceiptCommitmentAccount,
} from "@/lib/solana/proofContinuity/decodeCommitment";
import { findProofRegistryPda, findReceiptCommitmentPda } from "@/lib/solana/proofContinuity/pda";
import { verifyPrepareBindingToken } from "@/lib/partner/launchpad/blockchainNative/prepareBinding";
import {
  verifyConsumeEntitlementTransaction,
  verifyMintEntitlementTransaction,
} from "@/lib/solana/token2022Entitlement/verifyEntitlementTransaction";
import { evaluateConnectedSandboxBoundary } from "./connectedSandboxBoundary";

export type ConnectedTxReady =
  | {
      ok: true;
      phase: "mint_transaction_ready" | "consume_transaction_ready";
      transaction_base64: string;
      recent_blockhash: string;
      last_valid_block_height: number;
      public_accounts: ReturnType<typeof resolveEntitlementPublicAccounts>;
      rpc_url: string;
      cluster_label: string;
    }
  | { ok: false; code: string };

export type ConnectedConfirmResult =
  | {
      ok: true;
      phase: "mint_confirmed" | "consume_confirmed";
      transaction_signature: string;
      observation_slot: number;
      confirmation_commitment: "finalized" | "confirmed";
      token_balance: string | null;
      consumption_initialized: boolean;
      public_accounts: ReturnType<typeof resolveEntitlementPublicAccounts>;
      verification_tiers: {
        execution_report: { tier: "chain_transaction_signature"; disclaimer: string };
        structural_semantic: { tier: "not_applicable"; disclaimer: string };
        authenticated_chain: { tier: "rpc_observation"; status: "observed"; disclaimer: string };
      };
    }
  | { ok: false; code: string };

async function loadCommitmentForBinding(input: {
  connection: Connection;
  registryAdmin: PublicKey;
  receiptId: string;
  partnerId: string;
  policyId: string;
  applicationId: string;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const receiptHash = hashReceiptId(input.receiptId);
  const registry = findProofRegistryPda(input.registryAdmin);
  const commitmentPk = findReceiptCommitmentPda(registry.address, receiptHash);
  const info = await input.connection.getAccountInfo(commitmentPk.address, "confirmed");
  if (!info?.data) return { ok: false, code: "commitment_missing_on_chain" };
  const decoded = decodeReceiptCommitmentAccount(Buffer.from(info.data));
  if (!decoded) return { ok: false, code: "commitment_decode_failed" };
  const acceptable = commitmentIsCurrentlyAcceptable(decoded, Math.floor(Date.now() / 1000));
  if (!acceptable.ok) return { ok: false, code: acceptable.reason };
  if (decoded.partner_hash !== hashScopeId(input.partnerId).toString("hex")) {
    return { ok: false, code: "wrong_policy" };
  }
  if (decoded.policy_hash !== hashScopeId(input.policyId).toString("hex")) {
    return { ok: false, code: "wrong_policy" };
  }
  if (decoded.application_hash !== hashScopeId(input.applicationId).toString("hex")) {
    return { ok: false, code: "wrong_registry" };
  }
  return { ok: true };
}

export async function buildConnectedSandboxMintTransaction(input: {
  prepare_token: string;
  application_id: string;
  partner_id: string;
  holder_wallet: string;
}): Promise<ConnectedTxReady> {
  const boundary = await evaluateConnectedSandboxBoundary();
  if (!boundary.ok) return { ok: false, code: boundary.code };
  if (!boundary.mint_and_consume_actionable) return { ok: false, code: "connected_execution_unavailable" };

  const verified = verifyPrepareBindingToken(input.prepare_token, {
    application_id: input.application_id,
    partner_id: input.partner_id,
    holder_wallet: input.holder_wallet,
  });
  if (!verified.ok) return { ok: false, code: verified.code };

  const connection = new Connection(boundary.rpc_url, { commitment: "confirmed" });
  const admin = new PublicKey(boundary.registry_admin);
  const holder = new PublicKey(input.holder_wallet);
  const receiptHash = hashReceiptId(verified.binding.receipt_id);

  const commitmentOk = await loadCommitmentForBinding({
    connection,
    registryAdmin: admin,
    receiptId: verified.binding.receipt_id,
    partnerId: verified.binding.partner_id,
    policyId: verified.binding.policy_id,
    applicationId: verified.binding.application_id,
  });
  if (!commitmentOk.ok) return { ok: false, code: commitmentOk.code };

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: holder, recentBlockhash: blockhash });
  tx.add(
    buildMintVerifiedEntitlementInstruction({
      registryAdmin: admin,
      holder,
      payer: holder,
      receiptIdHash: receiptHash,
    }),
  );

  const relyingPartyAdmin = new PublicKey(boundary.relying_party_admin);
  const accounts = resolveEntitlementPublicAccounts({
    registryAdmin: admin,
    relyingPartyAdmin,
    holder,
    receiptIdHash: receiptHash,
  });

  return {
    ok: true,
    phase: "mint_transaction_ready",
    transaction_base64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    recent_blockhash: blockhash,
    last_valid_block_height: lastValidBlockHeight,
    public_accounts: accounts,
    rpc_url: boundary.rpc_url,
    cluster_label: boundary.cluster_label,
  };
}

export async function buildConnectedSandboxConsumeTransaction(input: {
  prepare_token: string;
  application_id: string;
  partner_id: string;
  holder_wallet: string;
}): Promise<ConnectedTxReady> {
  const boundary = await evaluateConnectedSandboxBoundary();
  if (!boundary.ok) return { ok: false, code: boundary.code };
  if (!boundary.mint_and_consume_actionable) return { ok: false, code: "connected_execution_unavailable" };

  const verified = verifyPrepareBindingToken(input.prepare_token, {
    application_id: input.application_id,
    partner_id: input.partner_id,
    holder_wallet: input.holder_wallet,
  });
  if (!verified.ok) return { ok: false, code: verified.code };

  const connection = new Connection(boundary.rpc_url, { commitment: "confirmed" });
  const admin = new PublicKey(boundary.registry_admin);
  const holder = new PublicKey(input.holder_wallet);
  const relyingPartyAdmin = new PublicKey(boundary.relying_party_admin);
  const receiptHash = hashReceiptId(verified.binding.receipt_id);

  const commitmentOk = await loadCommitmentForBinding({
    connection,
    registryAdmin: admin,
    receiptId: verified.binding.receipt_id,
    partnerId: verified.binding.partner_id,
    policyId: verified.binding.policy_id,
    applicationId: verified.binding.application_id,
  });
  if (!commitmentOk.ok) return { ok: false, code: commitmentOk.code };

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: holder, recentBlockhash: blockhash });
  tx.add(
    buildConsumeVerifiedEntitlementInstruction({
      registryAdmin: admin,
      relyingPartyAdmin,
      holder,
      payer: holder,
      receiptIdHash: receiptHash,
    }),
  );

  return {
    ok: true,
    phase: "consume_transaction_ready",
    transaction_base64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    recent_blockhash: blockhash,
    last_valid_block_height: lastValidBlockHeight,
    public_accounts: resolveEntitlementPublicAccounts({
      registryAdmin: admin,
      relyingPartyAdmin,
      holder,
      receiptIdHash: receiptHash,
    }),
    rpc_url: boundary.rpc_url,
    cluster_label: boundary.cluster_label,
  };
}

export async function confirmConnectedSandboxMint(input: {
  transaction_signature: string;
  holder_wallet: string;
  prepare_token: string;
  application_id: string;
  partner_id: string;
}): Promise<ConnectedConfirmResult> {
  const boundary = await evaluateConnectedSandboxBoundary();
  if (!boundary.ok) return { ok: false, code: boundary.code };

  const verified = verifyPrepareBindingToken(input.prepare_token, {
    application_id: input.application_id,
    partner_id: input.partner_id,
    holder_wallet: input.holder_wallet,
  });
  if (!verified.ok) return { ok: false, code: verified.code };

  const connection = new Connection(boundary.rpc_url, { commitment: "finalized" });
  const admin = new PublicKey(boundary.registry_admin);
  const holder = new PublicKey(input.holder_wallet);
  const relyingPartyAdmin = new PublicKey(boundary.relying_party_admin);
  const receiptHash = hashReceiptId(verified.binding.receipt_id);

  const txProof = await verifyMintEntitlementTransaction(connection, input.transaction_signature, {
    holder: input.holder_wallet,
    registryAdmin: boundary.registry_admin,
    relyingPartyAdmin: boundary.relying_party_admin,
    receiptIdHash: receiptHash,
  });
  if (!txProof.ok) return { ok: false, code: txProof.reason };

  const mint = resolveEntitlementPublicAccounts({
    registryAdmin: admin,
    relyingPartyAdmin,
    holder,
    receiptIdHash: receiptHash,
  });

  return {
    ok: true,
    phase: "mint_confirmed",
    transaction_signature: input.transaction_signature,
    observation_slot: txProof.slot,
    confirmation_commitment: txProof.confirmation_status,
    token_balance: txProof.token_balance,
    consumption_initialized: false,
    public_accounts: mint,
    verification_tiers: {
      execution_report: {
        tier: "chain_transaction_signature",
        disclaimer: "Transaction signature is a recorded execution claim until independently re-fetched.",
      },
      structural_semantic: {
        tier: "not_applicable",
        disclaimer: "Live RPC observation supersedes offline snapshots for this step.",
      },
      authenticated_chain: {
        tier: "rpc_observation",
        status: "observed",
        disclaimer:
          "Observed finalized RPC state at configured sandbox — not absolute cryptographic finality across independent auditors.",
      },
    },
  };
}

export async function confirmConnectedSandboxConsume(input: {
  transaction_signature: string;
  holder_wallet: string;
  prepare_token: string;
  application_id: string;
  partner_id: string;
}): Promise<ConnectedConfirmResult> {
  const boundary = await evaluateConnectedSandboxBoundary();
  if (!boundary.ok) return { ok: false, code: boundary.code };

  const verified = verifyPrepareBindingToken(input.prepare_token, {
    application_id: input.application_id,
    partner_id: input.partner_id,
    holder_wallet: input.holder_wallet,
  });
  if (!verified.ok) return { ok: false, code: verified.code };

  const connection = new Connection(boundary.rpc_url, { commitment: "finalized" });
  const admin = new PublicKey(boundary.registry_admin);
  const holder = new PublicKey(input.holder_wallet);
  const relyingPartyAdmin = new PublicKey(boundary.relying_party_admin);
  const receiptHash = hashReceiptId(verified.binding.receipt_id);

  const txProof = await verifyConsumeEntitlementTransaction(connection, input.transaction_signature, {
    holder: input.holder_wallet,
    registryAdmin: boundary.registry_admin,
    relyingPartyAdmin: boundary.relying_party_admin,
    receiptIdHash: receiptHash,
  });
  if (!txProof.ok) return { ok: false, code: txProof.reason };

  const accounts = resolveEntitlementPublicAccounts({
    registryAdmin: admin,
    relyingPartyAdmin,
    holder,
    receiptIdHash: receiptHash,
  });

  return {
    ok: true,
    phase: "consume_confirmed",
    transaction_signature: input.transaction_signature,
    observation_slot: txProof.slot,
    confirmation_commitment: txProof.confirmation_status,
    token_balance: null,
    consumption_initialized: true,
    public_accounts: accounts,
    verification_tiers: {
      execution_report: {
        tier: "chain_transaction_signature",
        disclaimer: "Transaction signature is a recorded execution claim until independently re-fetched.",
      },
      structural_semantic: {
        tier: "not_applicable",
        disclaimer: "Live RPC observation supersedes offline snapshots for this step.",
      },
      authenticated_chain: {
        tier: "rpc_observation",
        status: "observed",
        disclaimer:
          "Observed finalized RPC state at configured sandbox — not absolute cryptographic finality across independent auditors.",
      },
    },
  };
}