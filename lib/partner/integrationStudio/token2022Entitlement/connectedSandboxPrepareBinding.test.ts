import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrepareBindingPayload } from "@/lib/partner/launchpad/blockchainNative/prepareBinding";
import { resetConnectedSandboxPrepareStoreForTests } from "./connectedSandboxPrepareStore";
import {
  assertPreparedTransactionConfirmation,
  bindPreparedTransactionToPrepareToken,
} from "./connectedSandboxPrepareBinding";
import { loadFinalizedTransaction } from "@/lib/solana/token2022Entitlement/verifyEntitlementTransaction";
import { hashLegacyTransactionMessage } from "@/lib/solana/transactionMessageHash";

vi.mock("@/lib/solana/token2022Entitlement/verifyEntitlementTransaction", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/solana/token2022Entitlement/verifyEntitlementTransaction")>();
  return { ...original, loadFinalizedTransaction: vi.fn() };
});

const holder = Keypair.generate().publicKey;
const boundary = {
  ok: true as const,
  rpc_url: "http://127.0.0.1:8899",
  cluster_label: "sandbox-test",
  registry_admin: PublicKey.unique().toBase58(),
  relying_party_admin: PublicKey.unique().toBase58(),
  mint_and_consume_actionable: true,
  registry_pda: "reg",
  entitlement_mint_config_pda: "mc",
  trusted_config_pda: "tc",
};

function binding(jti: string): PrepareBindingPayload {
  return {
    v: 1,
    jti,
    application_id: "app-1",
    partner_id: "partner-1",
    policy_id: "policy-1",
    policy_version: 1,
    policy_template_id: "app-1",
    scenario_id: "token2022",
    holder_wallet: holder.toBase58(),
    execution_nonce: "1",
    receipt_id: "dr_binding_test",
    payload_hash_hex: "aa".repeat(32),
    persistence_digest: "bb".repeat(64),
    expires_at: Math.floor(Date.now() / 1000) + 600,
    persistence: {
      receipt_id: "dr_binding_test",
      expires_at: new Date(Date.now() + 600_000).toISOString(),
      public_payload: { payload_hash: "aa".repeat(64) },
    } as PrepareBindingPayload["persistence"],
  };
}

describe("connected sandbox prepare-to-confirmation binding", () => {
  beforeEach(() => {
    resetConnectedSandboxPrepareStoreForTests();
    vi.mocked(loadFinalizedTransaction).mockReset();
  });

  it("accepts confirmation when the on-chain message hash matches prepare", async () => {
    const tx = new Transaction({ feePayer: holder, recentBlockhash: "11111111111111111111111111111111" });
    const bind = binding("jti-ok");
    await bindPreparedTransactionToPrepareToken({
      binding: bind,
      boundary,
      tx,
      action: "mint",
      application_id: "app-1",
      partner_id: "partner-1",
      holder_wallet: holder.toBase58(),
    });
    const messageHash = hashLegacyTransactionMessage(tx);
    vi.mocked(loadFinalizedTransaction).mockResolvedValue({
      ok: true,
      tx: {
        transaction: { message: { serialize: () => tx.serializeMessage() } },
      } as never,
      confirmationStatus: "finalized",
      slot: 1,
    });

    const result = await assertPreparedTransactionConfirmation({
      action: "mint",
      application_id: "app-1",
      partner_id: "partner-1",
      holder_wallet: holder.toBase58(),
      transaction_signature: "sig-ok",
      binding: bind,
      boundary,
      connection: {} as never,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.generation).toBeGreaterThan(0);
      expect(result.message_hash_hex).toBe(messageHash);
    }
  });

  it("rejects an older transaction after prepare is refreshed", async () => {
    const blockhash = "11111111111111111111111111111111";
    const oldTx = new Transaction({ feePayer: holder, recentBlockhash: blockhash });
    const newTx = new Transaction({ feePayer: holder, recentBlockhash: blockhash });
    newTx.add(
      SystemProgram.transfer({ fromPubkey: holder, toPubkey: Keypair.generate().publicKey, lamports: 1 }),
    );
    const bind = binding("jti-refresh");
    await bindPreparedTransactionToPrepareToken({
      binding: bind,
      boundary,
      tx: oldTx,
      action: "mint",
      application_id: "app-1",
      partner_id: "partner-1",
      holder_wallet: holder.toBase58(),
    });
    await bindPreparedTransactionToPrepareToken({
      binding: bind,
      boundary,
      tx: newTx,
      action: "mint",
      application_id: "app-1",
      partner_id: "partner-1",
      holder_wallet: holder.toBase58(),
    });

    vi.mocked(loadFinalizedTransaction).mockResolvedValue({
      ok: true,
      tx: {
        transaction: { message: { serialize: () => oldTx.serializeMessage() } },
      } as never,
      confirmationStatus: "finalized",
      slot: 2,
    });

    const result = await assertPreparedTransactionConfirmation({
      action: "mint",
      application_id: "app-1",
      partner_id: "partner-1",
      holder_wallet: holder.toBase58(),
      transaction_signature: "sig-old",
      binding: bind,
      boundary,
      connection: {} as never,
    });
    expect(result).toEqual({ ok: false, code: "connected_prepare_message_mismatch" });
  });

  it("rejects wrong holder at confirmation scope check", async () => {
    const tx = new Transaction({ feePayer: holder, recentBlockhash: "11111111111111111111111111111111" });
    const bind = binding("jti-holder");
    await bindPreparedTransactionToPrepareToken({
      binding: bind,
      boundary,
      tx,
      action: "mint",
      application_id: "app-1",
      partner_id: "partner-1",
      holder_wallet: holder.toBase58(),
    });
    vi.mocked(loadFinalizedTransaction).mockResolvedValue({
      ok: true,
      tx: { transaction: { message: { serialize: () => tx.serializeMessage() } } } as never,
      confirmationStatus: "finalized",
      slot: 1,
    });
    const otherHolder = Keypair.generate().publicKey.toBase58();
    const result = await assertPreparedTransactionConfirmation({
      action: "mint",
      application_id: "app-1",
      partner_id: "partner-1",
      holder_wallet: otherHolder,
      transaction_signature: "sig-holder",
      binding: bind,
      boundary,
      connection: {} as never,
    });
    expect(result).toEqual({ ok: false, code: "prepare_binding_wallet_mismatch" });
  });
});