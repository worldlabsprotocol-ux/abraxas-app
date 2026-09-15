// FILE: lib/settlement/usdcAmount.test.ts

import { describe, expect, it } from "vitest";
import { formatUsdcAmountMicro, parseUsdcAmountMicro } from "@/lib/settlement/usdcAmount";

describe("parseUsdcAmountMicro", () => {
  it("accepts integer micro strings", () => {
    expect(parseUsdcAmountMicro("10000")).toEqual({ ok: true, amountMicroUsdc: 10000n });
  });

  it("accepts six decimal places", () => {
    expect(parseUsdcAmountMicro("1.500000")).toEqual({ ok: true, amountMicroUsdc: 1500000n });
  });

  it("rejects scientific notation", () => {
    expect(parseUsdcAmountMicro("1e6").ok).toBe(false);
  });

  it("rejects negative values", () => {
    expect(parseUsdcAmountMicro("-1").ok).toBe(false);
  });

  it("rejects zero", () => {
    expect(parseUsdcAmountMicro("0").ok).toBe(false);
  });

  it("rejects excessive precision", () => {
    expect(parseUsdcAmountMicro("0.0000001").ok).toBe(false);
  });

  it("rejects whitespace padded values", () => {
    expect(parseUsdcAmountMicro(" 1 ").ok).toBe(false);
  });

  it("round trips with formatter", () => {
    const parsed = parseUsdcAmountMicro("2.5");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(formatUsdcAmountMicro(parsed.amountMicroUsdc)).toBe("2.5");
    }
  });
});
