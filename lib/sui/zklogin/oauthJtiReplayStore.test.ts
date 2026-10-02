// FILE: lib/sui/zklogin/oauthJtiReplayStore.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeZkLoginOAuthJti,
  hashZkLoginOAuthJti,
  resetZkLoginOAuthJtiReplayStoreForTests,
} from "./oauthJtiReplayStore";

describe("oauth JTI replay store", () => {
  const env = { ...process.env };

  beforeEach(() => {
    resetZkLoginOAuthJtiReplayStoreForTests();
  });

  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
    resetZkLoginOAuthJtiReplayStoreForTests();
  });

  it("hashes JTIs without storing raw values", () => {
    const hash = hashZkLoginOAuthJti("abc123-jti-value");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("abc123");
  });

  it("allows independent JTIs", async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const first = await consumeZkLoginOAuthJti({ jti: "jti-a", expiresAtIso: expiresAt });
    const second = await consumeZkLoginOAuthJti({ jti: "jti-b", expiresAtIso: expiresAt });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
  });

  it("rejects replayed JTI", async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const first = await consumeZkLoginOAuthJti({ jti: "replay-jti", expiresAtIso: expiresAt });
    const second = await consumeZkLoginOAuthJti({ jti: "replay-jti", expiresAtIso: expiresAt });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, reason: "replayed" });
  });

  it("50 concurrent consumes: exactly one succeeds", async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const results = await Promise.all(
      Array.from({ length: 50 }, () => consumeZkLoginOAuthJti({
        jti: "concurrent-jti",
        expiresAtIso: expiresAt,
      })),
    );
    const successes = results.filter((row) => row.ok);
    const replays = results.filter((row) => !row.ok && row.reason === "replayed");
    expect(successes).toHaveLength(1);
    expect(replays).toHaveLength(49);
  });

  it("rejects malformed empty JTI", async () => {
    const result = await consumeZkLoginOAuthJti({
      jti: "   ",
      expiresAtIso: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(result).toEqual({ ok: false, reason: "store_unavailable" });
  });

  it("fails closed in production when durable store errors", async () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.OAUTH_JTI_FORCE_DURABLE_TEST = "1";
    vi.spyOn(await import("@/lib/supabase/admin"), "requireSupabaseAdmin").mockImplementation(() => ({
      from: () => ({
        insert: async () => ({ error: { code: "08000", message: "connection failure" } }),
      }),
    }) as never);

    const result = await consumeZkLoginOAuthJti({
      jti: "prod-fail-jti",
      expiresAtIso: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(result).toEqual({ ok: false, reason: "store_unavailable" });
    delete process.env.OAUTH_JTI_FORCE_DURABLE_TEST;
  });
});
