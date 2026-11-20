import { Connection, Transaction } from "@solana/web3.js";
import type { PrepareBindingPayload } from "@/lib/partner/launchpad/blockchainNative/prepareBinding";
import { hashLegacyTransactionMessage, hashVersionedTransactionMessage } from "@/lib/solana/transactionMessageHash";
import { loadFinalizedTransaction } from "@/lib/solana/token2022Entitlement/verifyEntitlementTransaction";
import type { ConnectedSandboxBoundaryResult } from "./connectedSandboxBoundary";
import {
  assertConnectedSandboxJtiActionNotReusedWithOtherTx,
  readConnectedSandboxPrepareRecord,
  requireConnectedSandboxPrepareStore,
  writeConnectedSandboxPrepareRecord,
  type ConnectedSandboxPrepareAction,
} from "./connectedSandboxPrepareStore";

type ConnectedBoundaryReady = Extract<ConnectedSandboxBoundaryResult, { ok: true }>;

export async function bindPreparedTransactionToPrepareToken(input: {
  binding: PrepareBindingPayload;
  boundary: ConnectedBoundaryReady;
  tx: Transaction;
  action: ConnectedSandboxPrepareAction;
  application_id: string;
  partner_id: string;
  holder_wallet: string;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const store = requireConnectedSandboxPrepareStore();
  if (!store.ok) return store;
  const message_hash_hex = hashLegacyTransactionMessage(input.tx);
  const ttlSec = Math.max(60, input.binding.expires_at - Math.floor(Date.now() / 1000));
  await writeConnectedSandboxPrepareRecord(
    {
      v: 1,
      action: input.action,
      jti: input.binding.jti,
      application_id: input.application_id,
      partner_id: input.partner_id,
      holder_wallet: input.holder_wallet,
      receipt_id: input.binding.receipt_id,
      cluster_label: input.boundary.cluster_label,
      message_hash_hex,
      expires_at: input.binding.expires_at,
    },
    ttlSec,
  );
  return { ok: true };
}

function prepareScopeMatchesRecord(
  record: {
    application_id: string;
    partner_id: string;
    holder_wallet: string;
    receipt_id: string;
    cluster_label: string;
    message_hash_hex: string;
  },
  input: {
    application_id: string;
    partner_id: string;
    holder_wallet: string;
    binding: PrepareBindingPayload;
    boundary: ConnectedBoundaryReady;
  },
): { ok: true } | { ok: false; code: string } {
  if (record.application_id !== input.application_id) return { ok: false, code: "prepare_binding_application_mismatch" };
  if (record.partner_id !== input.partner_id) return { ok: false, code: "prepare_binding_partner_mismatch" };
  if (record.holder_wallet !== input.holder_wallet) return { ok: false, code: "prepare_binding_wallet_mismatch" };
  if (record.receipt_id !== input.binding.receipt_id) return { ok: false, code: "prepare_binding_receipt_mismatch" };
  if (record.cluster_label !== input.boundary.cluster_label) {
    return { ok: false, code: "connected_prepare_cluster_mismatch" };
  }
  return { ok: true };
}

export async function assertPreparedTransactionConfirmation(input: {
  action: ConnectedSandboxPrepareAction;
  application_id: string;
  partner_id: string;
  holder_wallet: string;
  transaction_signature: string;
  binding: PrepareBindingPayload;
  boundary: ConnectedBoundaryReady;
  connection: Connection;
}): Promise<
  | { ok: true; generation: number; message_hash_hex: string }
  | { ok: false; code: string }
> {
  const store = requireConnectedSandboxPrepareStore();
  if (!store.ok) return store;

  const prepared = await readConnectedSandboxPrepareRecord(input.binding.jti, input.action);
  if (!prepared) return { ok: false, code: "connected_prepare_not_found" };

  const scope = prepareScopeMatchesRecord(prepared, input);
  if (!scope.ok) return scope;

  const ticketGeneration = prepared.generation;
  const ticketMessageHash = prepared.message_hash_hex;

  const loaded = await loadFinalizedTransaction(input.connection, input.transaction_signature);
  if (!loaded.ok) return { ok: false, code: loaded.reason };
  const onChainHash = hashVersionedTransactionMessage(loaded.tx);
  if (onChainHash !== ticketMessageHash) {
    return { ok: false, code: "connected_prepare_message_mismatch" };
  }

  const stillPrepared = await readConnectedSandboxPrepareRecord(input.binding.jti, input.action);
  if (
    !stillPrepared
    || stillPrepared.generation !== ticketGeneration
    || stillPrepared.message_hash_hex !== ticketMessageHash
  ) {
    return { ok: false, code: "prepare_superseded" };
  }

  const ttlSec = Math.max(60, input.binding.expires_at - Math.floor(Date.now() / 1000));
  const jtiGuard = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
    jti: input.binding.jti,
    action: input.action,
    transactionSignature: input.transaction_signature,
    ttlSec,
    generation: ticketGeneration,
  });
  if (!jtiGuard.ok) return jtiGuard;

  return { ok: true, generation: ticketGeneration, message_hash_hex: ticketMessageHash };
}