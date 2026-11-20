import { beforeEach, describe, expect, it } from "vitest";
import {
  assertConnectedSandboxJtiActionNotReusedWithOtherTx,
  readCachedToken2022ConnectedConfirm,
  readConnectedSandboxPrepareRecord,
  resetConnectedSandboxPrepareStoreForTests,
  writeCachedToken2022ConnectedConfirm,
  writeConnectedSandboxPrepareRecord,
  type ConnectedSandboxPrepareAction,
} from "./connectedSandboxPrepareStore";

const expires = Math.floor(Date.now() / 1000) + 600;

function baseRecord(jti: string, action: ConnectedSandboxPrepareAction, messageHash: string) {
  return {
    v: 1 as const,
    action,
    jti,
    application_id: "app",
    partner_id: "partner",
    holder_wallet: "holder",
    receipt_id: "dr_same",
    cluster_label: "sandbox",
    message_hash_hex: messageHash,
    expires_at: expires,
  };
}

async function prepareWithGeneration(jti: string, action: ConnectedSandboxPrepareAction, hash: string) {
  await writeConnectedSandboxPrepareRecord(baseRecord(jti, action, hash), 600);
  const record = await readConnectedSandboxPrepareRecord(jti, action);
  if (!record) throw new Error("prepare_missing");
  return record;
}

describe("token2022 connected prepare store", () => {
  beforeEach(() => {
    resetConnectedSandboxPrepareStoreForTests();
  });

  it("rejects a second transaction signature for the same jti and action", async () => {
    const record = await prepareWithGeneration("jti-1", "mint", "a".repeat(64));
    const first = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-1",
      action: "mint",
      transactionSignature: "sig-a",
      ttlSec: 120,
      generation: record.generation,
    });
    expect(first).toEqual({ ok: true });
    const second = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-1",
      action: "mint",
      transactionSignature: "sig-b",
      ttlSec: 120,
      generation: record.generation,
    });
    expect(second).toEqual({ ok: false, code: "prepare_binding_replay" });
  });

  it("allows the same signature to retry confirmation idempotently", async () => {
    const record = await prepareWithGeneration("jti-2", "consume", "b".repeat(64));
    const first = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-2",
      action: "consume",
      transactionSignature: "sig-same",
      ttlSec: 120,
      generation: record.generation,
    });
    const second = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-2",
      action: "consume",
      transactionSignature: "sig-same",
      ttlSec: 120,
      generation: record.generation,
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
  });

  it("scopes replay guards separately for mint and consume on the same jti", async () => {
    const mintRec = await prepareWithGeneration("shared-jti", "mint", "c".repeat(64));
    await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "shared-jti",
      action: "mint",
      transactionSignature: "mint-sig",
      ttlSec: 120,
      generation: mintRec.generation,
    });
    const consumeRec = await prepareWithGeneration("shared-jti", "consume", "d".repeat(64));
    const consume = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "shared-jti",
      action: "consume",
      transactionSignature: "consume-sig",
      ttlSec: 120,
      generation: consumeRec.generation,
    });
    expect(consume).toEqual({ ok: true });
  });

  it("replaces prepared message hash and bumps generation on refresh", async () => {
    const first = await prepareWithGeneration("jti-new-prep", "mint", "a".repeat(64));
    const second = await prepareWithGeneration("jti-new-prep", "mint", "b".repeat(64));
    expect(second.generation).toBeGreaterThan(first.generation);
    expect(second.message_hash_hex).toBe("b".repeat(64));
  });

  it("returns cached confirm payloads for duplicate confirmation requests", async () => {
    const hash = "f".repeat(64);
    const record = await prepareWithGeneration("jti-cache", "mint", hash);
    await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-cache",
      action: "mint",
      transactionSignature: "sig-cache",
      ttlSec: 120,
      generation: record.generation,
    });
    const result = {
      ok: true as const,
      phase: "mint_confirmed" as const,
      prepared_message_hash_hex: hash,
      preparation_generation: record.generation,
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
    const wrote = await writeCachedToken2022ConnectedConfirm(
      {
        jti: "jti-cache",
        action: "mint",
        messageHashHex: hash,
        transactionSignature: "sig-cache",
        generation: record.generation,
      },
      result,
      300,
    );
    expect(wrote).toEqual({ ok: true });
    const cached = await readCachedToken2022ConnectedConfirm({
      jti: "jti-cache",
      action: "mint",
      messageHashHex: hash,
      transactionSignature: "sig-cache",
    });
    expect(cached?.transaction_signature).toBe("sig-cache");
  });
});