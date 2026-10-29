import { describe, expect, it, vi } from "vitest";
import { probeReferenceExampleServer, REFERENCE_EXAMPLE_HEALTH_URL } from "@/lib/developers/referenceExampleServer";

describe("probeReferenceExampleServer", () => {
  it("returns reachable when health JSON ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true, service: "external-node-partner" }),
      })) as typeof fetch,
    );
    await expect(probeReferenceExampleServer()).resolves.toBe("reachable");
    expect(fetch).toHaveBeenCalledWith(
      REFERENCE_EXAMPLE_HEALTH_URL,
      expect.objectContaining({ method: "GET" }),
    );
    vi.unstubAllGlobals();
  });

  it("returns unreachable on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("connection refused");
    }) as typeof fetch);
    await expect(probeReferenceExampleServer()).resolves.toBe("unreachable");
    vi.unstubAllGlobals();
  });
});
