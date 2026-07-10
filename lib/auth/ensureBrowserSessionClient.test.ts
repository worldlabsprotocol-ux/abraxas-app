// FILE: lib/auth/ensureBrowserSessionClient.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ensureBrowserSession } from "@/lib/auth/ensureBrowserSessionClient";

describe("ensureBrowserSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("probes with retry after successful POST before returning ok", async () => {
    let getCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/auth/browser-session") && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/api/auth/browser-session") && method === "GET") {
        getCalls += 1;
        if (getCalls >= 2) {
          return new Response(JSON.stringify({ authenticated: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ authenticated: false }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
    }));

    const promise = ensureBrowserSession("0xabc");
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(getCalls).toBeGreaterThanOrEqual(2);
  });
});
