// FILE: examples/good-trouble-wix/backend/wixDataCount.test.js

import { describe, expect, it } from "vitest";
import { normalizeWixDataCount } from "./wixDataCount.js";

describe("normalizeWixDataCount", () => {
  it("accepts non-negative integer counts", () => {
    expect(normalizeWixDataCount(0)).toBe(0);
    expect(normalizeWixDataCount(42)).toBe(42);
  });

  it("normalizes object-shaped Wix count results", () => {
    expect(normalizeWixDataCount({ totalCount: 5 })).toBe(5);
    expect(normalizeWixDataCount({ count: 3 })).toBe(3);
    expect(normalizeWixDataCount({ total: 7 })).toBe(7);
  });

  it("rejects invalid shapes", () => {
    expect(normalizeWixDataCount(undefined)).toBeNull();
    expect(normalizeWixDataCount(-1)).toBeNull();
    expect(normalizeWixDataCount(1.5)).toBeNull();
    expect(normalizeWixDataCount({ totalCount: -1 })).toBeNull();
  });
});
