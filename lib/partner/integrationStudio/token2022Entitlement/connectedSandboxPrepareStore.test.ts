import { beforeEach, describe, expect, it } from "vitest";
import {
  assertConnectedSandboxJtiActionNotReusedWithOtherTx,
  readCachedToken2022ConnectedConfirm,
  resetConnectedSandboxPrepareStoreForTests,
  writeCachedToken2022ConnectedConfirm,
  writeConnectedSandboxPrepareRecord,
} from "./connectedSandboxPrepareStore";

describe("token2022 connected prepare store", () => {
  beforeEach(() => {
    resetConnectedSandboxPrepareStoreForTests();
  });

  it("rejects a second transaction signature for the same jti and action", async () => {
    const first = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-1",
      action: "mint",
      transactionSignature: "sig-a",
      ttlSec: 120,
    });
    expect(first).toEqual({ ok: true });
    const second = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-1",
      action: "mint",
      transactionSignature: "sig-b",
      ttlSec: 120,
    });
    expect(second).toEqual({ ok: false, code: "prepare_binding_replay" });
  });

  it("allows the same signature to retry confirmation idempotently", async () => {
    const first = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-2",
      action: "consume",
      transactionSignature: "sig-same",
      ttlSec: 120,
    });
    const second = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-2",
      action: "consume",
      transactionSignature: "sig-same",
      ttlSec: 120,
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
  });

  it("scopes replay guards separately for mint and consume on the same jti", async () => {
    await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "shared-jti",
      action: "mint",
      transactionSignature: "mint-sig",
      ttlSec: 120,
    });
    const consume = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "shared-jti",
      action: "consume",
      transactionSignature: "consume-sig",
      ttlSec: 120,
    });
    expect(consume).toEqual({ ok: true });
  });

  it("replaces prepared message hash when a new prepare is written", async () => {
    const expires = Math.floor(Date.now() / 1000) + 600;
    await writeConnectedSandboxPrepareRecord(
      {
        v: 1,
        action: "mint",
        jti: "jti-new-prep",
        application_id: "app",
        partner_id: "partner",
        holder_wallet: "holder",
        receipt_id: "dr_same",
        cluster_label: "sandbox",
        message_hash_hex: "a".repeat(64),
        expires_at: expires,
      },
      600,
    );
    await writeConnectedSandboxPrepareRecord(
      {
        v: 1,
        action: "mint",
        jti: "jti-new-prep",
        application_id: "app",
        partner_id: "partner",
        holder_wallet: "holder",
        receipt_id: "dr_same",
        cluster_label: "sandbox",
        message_hash_hex: "b".repeat(64),
        expires_at: expires,
      },
      600,
    );
    const { readConnectedSandboxPrepareRecord } = await import("./connectedSandboxPrepareStore");
    const latest = await readConnectedSandboxPrepareRecord("jti-new-prep", "mint");
    expect(latest?.message_hash_hex).toBe("b".repeat(64));
  });

  it("returns cached confirm payloads for duplicate confirmation requests", async () => {
    const result = {
      ok: true as const,
      phase: "mint_confirmed" as const,
      transaction_signature: "sig-cache",
      observation_slot: 9,
      confirmation_commitment: "finalized" as const,
      token_balance: "1",
      consumption_initialized: false,
      public_accounts: {
        registry: "reg",
        commitment: "cmt",
        entitlement_mint: "mint",
        trusted_config: "tc",
        issuance_ledger: "il",
        consumption: "con",
        holder_token_account: "ata",
      },
      verification_tiers: {
        execution_report: { tier: "chain_transaction_signature" as const, disclaimer: "" },
        structural_semantic: { tier: "not_applicable" as const, disclaimer: "" },
        authenticated_chain: { tier: "rpc_observation" as const, status: "observed" as const, disclaimer: "" },
      },
    };
    await writeCachedToken2022ConnectedConfirm(
      { jti: "jti-cache", action: "mint", transactionSignature: "sig-cache" },
      result,
      300,
    );
    const cached = await readCachedToken2022ConnectedConfirm({
      jti: "jti-cache",
      action: "mint",
      transactionSignature: "sig-cache",
    });
    expect(cached?.transaction_signature).toBe("sig-cache");
  });
});