// FILE: examples/good-trouble-wix/backend/sha256Adapter.test.js

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Hex, sha256HexSync } from "./sha256Adapter.js";

const KNOWN_VECTOR = {
  input: "test",
  expected: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
};

describe("sha256Adapter", () => {
  it("returns deterministic SHA-256 output for known input", async () => {
    expect(sha256HexSync(KNOWN_VECTOR.input)).toBe(KNOWN_VECTOR.expected);
    expect(await sha256Hex(KNOWN_VECTOR.input)).toBe(KNOWN_VECTOR.expected);
    expect(sha256HexSync(KNOWN_VECTOR.input)).toBe(
      createHash("sha256").update(KNOWN_VECTOR.input, "utf8").digest("hex"),
    );
  });

  it("returns lowercase 64-character hex", async () => {
    const digest = await sha256Hex("verifier-challenge-input");
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).toBe(digest.toLowerCase());
    expect(digest).toHaveLength(64);
  });

  it("rejects non-string input", () => {
    expect(() => sha256HexSync(/** @type {unknown} */ (null))).toThrow(TypeError);
    expect(() => sha256HexSync(/** @type {unknown} */ (42))).toThrow("sha256 input must be a string");
  });
});
