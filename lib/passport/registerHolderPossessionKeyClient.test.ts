// FILE: lib/passport/registerHolderPossessionKeyClient.test.ts

import { describe, expect, it, vi } from "vitest";
import { registerHolderPossessionKeyWithServer } from "./registerHolderPossessionKeyClient";

describe("registerHolderPossessionKeyWithServer", () => {
  it("returns success only after server accepts registration", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("possession-key") && (!init || init.method === "POST")) {
        return new Response(JSON.stringify({ rotated: false, issuance: { deferred: true } }), { status: 200 });
      }
      return new Response(JSON.stringify({ public_key_b64url: null }), { status: 200 });
    }) as typeof fetch;

    const result = await registerHolderPossessionKeyWithServer({
      publicKeyB64Url: "pub_new",
      secretKeyB64Url: "sec_new",
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.publicKeyB64Url).toBe("pub_new");
    }
  });

  it("preserves local key hint on server rejection", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: "invalid_public_key" }), { status: 400 }),
    ) as typeof fetch;
    const result = await registerHolderPossessionKeyWithServer({
      publicKeyB64Url: "pub_bad",
      secretKeyB64Url: "sec_bad",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.preserveLocalKey).toBe(true);
      expect(result.code).toBe("invalid_public_key");
    }
  });

  it("reconciles ambiguous network failure when server shows new public key", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls += 1;
      if (init?.method === "POST" && calls === 1) {
        throw new Error("network reset");
      }
      return new Response(JSON.stringify({ public_key_b64url: "pub_reconciled" }), { status: 200 });
    }) as typeof fetch;

    const result = await registerHolderPossessionKeyWithServer({
      publicKeyB64Url: "pub_reconciled",
      secretKeyB64Url: "sec_reconciled",
      fetchImpl,
    });
    expect(result.ok).toBe(true);
  });
});
