import { beforeEach, describe, expect, it } from "vitest";
import { readCurrentPreparedToken2022Confirm } from "./connectedSandboxConfirmCache";
import {
  resetConnectedSandboxPrepareStoreForTests,
  writeCachedToken2022ConnectedConfirm,
  writeConnectedSandboxPrepareRecord,
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

describe("connected sandbox confirm cache consistency", () => {
  beforeEach(() => {
    resetConnectedSandboxPrepareStoreForTests();
  });

  it("does not return a cache entry after prepare message hash is replaced", async () => {
    const oldHash = "a".repeat(64);
    const newHash = "b".repeat(64);
    await writeConnectedSandboxPrepareRecord(prepareRecord(oldHash), 600);
    const cachedPayload = {
      ok: true as const,
      phase: "mint_confirmed" as const,
      prepared_message_hash_hex: oldHash,
      transaction_signature: "sig-old",
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
    await writeCachedToken2022ConnectedConfirm(
      { jti: "jti-cache-gen", action: "mint", messageHashHex: oldHash, transactionSignature: "sig-old" },
      cachedPayload,
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

  it("returns cache when message hash still matches current preparation", async () => {
    const hash = "c".repeat(64);
    await writeConnectedSandboxPrepareRecord(prepareRecord(hash), 600);
    const payload = {
      ok: true as const,
      phase: "mint_confirmed" as const,
      prepared_message_hash_hex: hash,
      transaction_signature: "sig-current",
      observation_slot: 2,
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
    await writeCachedToken2022ConnectedConfirm(
      { jti: "jti-cache-gen", action: "mint", messageHashHex: hash, transactionSignature: "sig-current" },
      payload,
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

  it("allows a new signature binding after prepare refresh clears jti action state", async () => {
    const { assertConnectedSandboxJtiActionNotReusedWithOtherTx } = await import("./connectedSandboxPrepareStore");
    await writeConnectedSandboxPrepareRecord(prepareRecord("d".repeat(64)), 600);
    const first = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-cache-gen",
      action: "mint",
      transactionSignature: "sig-first",
      ttlSec: 120,
    });
    expect(first).toEqual({ ok: true });
    await writeConnectedSandboxPrepareRecord(prepareRecord("e".repeat(64)), 600);
    const second = await assertConnectedSandboxJtiActionNotReusedWithOtherTx({
      jti: "jti-cache-gen",
      action: "mint",
      transactionSignature: "sig-second",
      ttlSec: 120,
    });
    expect(second).toEqual({ ok: true });
  });
});