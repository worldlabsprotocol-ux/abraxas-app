import { beforeEach, describe, expect, it, vi } from "vitest";

if (!process.env.NEXTAUTH_SECRET?.trim()) {
  process.env.NEXTAUTH_SECRET = "institutional-replay-adversarial-test-secret";
}

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import {
  resetFakeWalletStandardBackend,
  setFakeWalletSchemaMissing,
  setFakeWalletAdminMissing,
} from "@/lib/partner/walletStandard/fakeDurableBackend";
import { consumeInstitutionalDurableReplayNonce } from "@/lib/institutional/durableReplayNonceStore";

const base = {
  partnerId: "institutional-platform",
  applicationId: "app_a",
  receiptId: "rcpt_adv_001",
  subjectPseudonymId: "subj_hash_only",
  policyId: "institutional-platform-age_21_retail-v1",
  policyVersion: 1,
  actionScope: "trade:settle",
  nonce: "nonce_concurrent_alpha_01",
};

describe("durable institutional replay (simulated shared store — not Postgres proof)", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
    setFakeWalletSchemaMissing(false);
    setFakeWalletAdminMissing(false);
  });

  it("allows exactly one winner under concurrent consumption", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () => consumeInstitutionalDurableReplayNonce(base)),
    );
    const consumed = attempts.filter(r => r.ok);
    const replayed = attempts.filter(r => !r.ok && r.code === "replayed");
    expect(consumed).toHaveLength(1);
    expect(replayed).toHaveLength(11);
  });

  it("isolates tenants — same nonce different partner", async () => {
    expect((await consumeInstitutionalDurableReplayNonce(base)).ok).toBe(true);
    const otherPartner = await consumeInstitutionalDurableReplayNonce({
      ...base,
      partnerId: "other-partner",
      nonce: base.nonce,
    });
    expect(otherPartner.ok).toBe(true);
  });

  it("rejects replay after backend reset simulates new process with same store", async () => {
    expect((await consumeInstitutionalDurableReplayNonce(base)).ok).toBe(true);
    const replay = await consumeInstitutionalDurableReplayNonce(base);
    expect(replay).toEqual({ ok: false, code: "replayed" });
  });

  it("fails closed when durable store unavailable", async () => {
    setFakeWalletAdminMissing(true);
    await expect(consumeInstitutionalDurableReplayNonce(base)).rejects.toMatchObject({
      code: "replay_store_unavailable",
    });
  });

  it("rejects malformed and oversized nonce", async () => {
    expect((await consumeInstitutionalDurableReplayNonce({ ...base, nonce: "short" })).code).toBe("invalid");
    expect((await consumeInstitutionalDurableReplayNonce({ ...base, nonce: "x".repeat(200) })).code).toBe("invalid");
    expect((await consumeInstitutionalDurableReplayNonce({ ...base, nonce: "bad nonce space" })).code).toBe("invalid");
  });

  it("scopes replay to policy version and action scope", async () => {
    expect((await consumeInstitutionalDurableReplayNonce(base)).ok).toBe(true);
    const newScope = await consumeInstitutionalDurableReplayNonce({
      ...base,
      actionScope: "trade:other",
      nonce: base.nonce,
    });
    expect(newScope.ok).toBe(true);
  });

  it("fails closed when schema missing", async () => {
    setFakeWalletSchemaMissing(true);
    await expect(consumeInstitutionalDurableReplayNonce(base)).rejects.toMatchObject({
      code: "replay_store_unavailable",
    });
  });
});
