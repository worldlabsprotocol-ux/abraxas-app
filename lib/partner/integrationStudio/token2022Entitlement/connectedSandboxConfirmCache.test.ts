import { beforeEach, describe, expect, it } from "vitest";
import { readCurrentPreparedToken2022Confirm } from "./connectedSandboxConfirmCache";
import {
  assertConnectedSandboxJtiActionNotReusedWithOtherTx,
  resetConnectedSandboxPrepareStoreForTests,
  writeCachedToken2022ConnectedConfirm,
  writeConnectedSandboxPrepareRecord,
  readConnectedSandboxPrepareRecord,
} from "./connectedSandboxPrepareStore";

const expires = Math.floor(Date.now() / 1000) + 600;

function prepareRecord(messageHash: string) {
  return {
    v: 1 as const,
    action: "mint" as const,
    jti: "jti-cache-gen",
    application_id: "app",
    partner_id: "partner",
    holder_wallet: "holder",
    receipt_id: "dr",
    cluster_label: "sandbox",
    message_hash_hex: messageHash,
    expires_at: expires,
  };
}

function confirmPayload(hash: string, generation: number, signature: string) {
  return {
    ok: true as const,
    phase: "mint_confirmed" as const,
    prepared_message_hash_hex: hash,
    preparation_generation: generation,
    transaction_signature: signature,
    observation_slot: 1,
    confirmation_commitment: "finalized" as const,
    token_balance: "1",
    consumption_initialized: false,
    public_accounts: {
      registry: "r",
      commitment: "c",
      entitlement_mint: "m",
      trusted_config: "t",
      issuance_ledger: "i",
      consumption: "x",
      holder_token_account: "h",
    },
    verification_tiers: {
      execution_report: { tier: "chain_transaction_signature" as const, disclaimer: "" },
      structural_semantic: { tier: "not_applicable" as const, disclaimer: "" },
      authenticated_chain: { tier: "rpc_observation" as const, status: "observed" as const, disclaimer: "" },
    },
  };
}

async function bindPreparedSignature(jti: string, action: "mint", signature: string) {
  const record = await readConnectedSandboxPrepareRecord(jti, action);
  if (!record) throw new Error("missing prepare");
  await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
    jti,
    action,
    transactionSignature: signature,
    ttlSec: 120,
    generation: record.generation,
  });
  return record;
}

describe("connected sandbox confirm cache consistency", () => {
  beforeEach(() => {
    resetConnectedSandboxPrepareStoreForTests();
  });

  it("does not return a cache entry after prepare message hash is replaced", async () => {
    const oldHash = "a".repeat(64);
    const newHash = "b".repeat(64);
    await writeConnectedSandboxPrepareRecord(prepareRecord(oldHash), 600);
    const oldRecord = await bindPreparedSignature("jti-cache-gen", "mint", "sig-old");
    await writeCachedToken2022ConnectedConfirm(
      { jti: "jti-cache-gen", action: "mint", messageHashHex: oldHash, transactionSignature: "sig-old", generation: oldRecord.generation },
      confirmPayload(oldHash, oldRecord.generation, "sig-old"),
      300,
    );

    await writeConnectedSandboxPrepareRecord(prepareRecord(newHash), 600);

    const hit = await readCurrentPreparedToken2022Confirm({
      jti: "jti-cache-gen",
      action: "mint",
      transactionSignature: "sig-old",
    });
    expect(hit.ok).toBe(false);
    if (!hit.ok) expect(hit.code).toBe("connected_confirm_cache_miss");
  });

  it("returns cache when message hash and generation still match current preparation", async () => {
    const hash = "c".repeat(64);
    await writeConnectedSandboxPrepareRecord(prepareRecord(hash), 600);
    const record = await bindPreparedSignature("jti-cache-gen", "mint", "sig-current");
    await writeCachedToken2022ConnectedConfirm(
      {
        jti: "jti-cache-gen",
        action: "mint",
        messageHashHex: hash,
        transactionSignature: "sig-current",
        generation: record.generation,
      },
      confirmPayload(hash, record.generation, "sig-current"),
      300,
    );

    const hit = await readCurrentPreparedToken2022Confirm({
      jti: "jti-cache-gen",
      action: "mint",
      transactionSignature: "sig-current",
    });
    expect(hit.ok).toBe(true);
    expect(hit.ok && hit.cached.transaction_signature).toBe("sig-current");
  });

  it("allows a new signature binding after prepare refresh increments generation", async () => {
    await writeConnectedSandboxPrepareRecord(prepareRecord("d".repeat(64)), 600);
    const first = await bindPreparedSignature("jti-cache-gen", "mint", "sig-first");
    await writeConnectedSandboxPrepareRecord(prepareRecord("e".repeat(64)), 600);
    const refreshed = await readConnectedSandboxPrepareRecord("jti-cache-gen", "mint");
    expect(refreshed?.generation).toBeGreaterThan(first.generation);
    const second = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-cache-gen",
      action: "mint",
      transactionSignature: "sig-second",
      ttlSec: 120,
      generation: refreshed!.generation,
    });
    expect(second).toEqual({ ok: true });
  });
});