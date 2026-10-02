// FILE: lib/provenance/expectedContentHash.test.ts

import { describe, expect, it } from "vitest";
import { isValidExpectedContentHash, normalizeExpectedContentHash } from "./expectedContentHash";

describe("expectedContentHash", () => {
  it("accepts lowercase sha256 hex", () => {
    const hash = "a".repeat(64);
    expect(normalizeExpectedContentHash(hash)).toBe(hash);
    expect(isValidExpectedContentHash(hash)).toBe(true);
  });

  it("rejects malformed hashes", () => {
    expect(normalizeExpectedContentHash("not-a-hash")).toBeNull();
    expect(isValidExpectedContentHash("abc")).toBe(false);
  });
});
