import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

describe("getIdvProvider", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.IDV_PROVIDER;
    delete process.env.VERIFF_API_KEY;
    delete process.env.VERIFF_DISABLED;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to manual (Abraxas Verify) when IDV_PROVIDER is unset", async () => {
    process.env.VERIFF_API_KEY = "live-key";
    const { getIdvProvider, isAbraxasIndependentIdv } = await import("./idvProvider");
    expect(getIdvProvider()).toBe("manual");
    expect(isAbraxasIndependentIdv()).toBe(true);
  });

  it("uses veriff only when IDV_PROVIDER=veriff is explicit", async () => {
    process.env.IDV_PROVIDER = "veriff";
    const { getIdvProvider, isVeriffLive } = await import("./idvProvider");
    expect(getIdvProvider()).toBe("veriff");
    expect(isVeriffLive()).toBe(true);
  });

  it("respects IDV_PROVIDER=manual override", async () => {
    process.env.IDV_PROVIDER = "manual";
    const { getIdvProvider } = await import("./idvProvider");
    expect(getIdvProvider()).toBe("manual");
  });
});
