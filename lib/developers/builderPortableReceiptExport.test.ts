import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchBuilderPortableExport } from "./builderPortableReceiptExport";

describe("fetchBuilderPortableExport", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns live bundle when export succeeds", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, bundle: { decision_receipt: { id: "dr_test" } } }),
    } as Response);
    const result = await fetchBuilderPortableExport("dr_test");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.label).toBe("live_sandbox_receipt");
  });

  it("fails closed with gaps when issuer export is missing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        ok: false,
        error: "issuer_export_not_configured",
        gaps: ["receipt_registry_unavailable"],
      }),
    } as Response);
    const result = await fetchBuilderPortableExport("dr_test");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.httpStatus).toBe(503);
      expect(result.error).toBe("issuer_export_not_configured");
      expect(result.gaps).toContain("receipt_registry_unavailable");
    }
  });
});