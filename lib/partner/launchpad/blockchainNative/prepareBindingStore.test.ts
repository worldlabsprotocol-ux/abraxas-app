import { describe, expect, it, beforeEach } from "vitest";
import {
  assertPrepareJtiNotReusedWithOtherTx,
  readCachedBlockchainNativeConfirm,
  resetBlockchainNativePrepareBindingStoreForTests,
  writeCachedBlockchainNativeConfirm,
} from "./prepareBindingStore";

describe("blockchain-native prepare binding store", () => {
  beforeEach(() => {
    resetBlockchainNativePrepareBindingStoreForTests();
  });

  it("rejects a second confirm transaction for the same prepare jti", async () => {
    const jti = "jti-concurrent-test";
    const first = await assertPrepareJtiNotReusedWithOtherTx({
      jti,
      transactionSignature: "sig-a",
      ttlSec: 120,
    });
    expect(first).toEqual({ ok: true });
    const second = await assertPrepareJtiNotReusedWithOtherTx({
      jti,
      transactionSignature: "sig-b",
      ttlSec: 120,
    });
    expect(second).toEqual({ ok: false, code: "prepare_binding_replay" });
  });

  it("allows duplicate confirm with the same signature (idempotent)", async () => {
    const jti = "jti-idempotent";
    const first = await assertPrepareJtiNotReusedWithOtherTx({
      jti,
      transactionSignature: "sig-same",
      ttlSec: 120,
    });
    const second = await assertPrepareJtiNotReusedWithOtherTx({
      jti,
      transactionSignature: "sig-same",
      ttlSec: 120,
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
  });

  it("returns cached confirm results for duplicate confirmation", async () => {
    const key = {
      applicationId: "app-1",
      receiptId: "dr_test",
      transactionSignature: "sig-cache",
    };
    const bundle = {
      ok: true as const,
      receipt_id: "dr_test",
      payload_hash_hex: "aa".repeat(32),
      observation_slot: 42,
      transaction_signature: "sig-cache",
      chain_status_version: BigInt(1),
      portable: { cryptographically_authentic: true, independent_verification_fully_accepts: true },
    };
    await writeCachedBlockchainNativeConfirm(key, bundle, 300);
    const cached = await readCachedBlockchainNativeConfirm(key);
    expect(cached?.receipt_id).toBe("dr_test");
  });
});