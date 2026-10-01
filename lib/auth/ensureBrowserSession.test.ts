// FILE: lib/auth/ensureBrowserSession.test.ts
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { ensureBrowserSessionReady } from "./ensureBrowserSession";

describe("ensureBrowserSessionReady", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts an existing HttpOnly browser session without Google id_token", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/browser-session") && init?.method === "GET") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
    }) as typeof fetch;

    const result = await ensureBrowserSessionReady("0x" + "b".repeat(64));
    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
