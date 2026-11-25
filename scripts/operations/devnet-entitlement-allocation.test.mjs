import test from "node:test";
import assert from "node:assert/strict";
import { programAllocationBytes } from "./devnet-entitlement-allocation.mjs";

test("reserves a modest rounded margin for both reviewed program sizes", () => {
  assert.equal(programAllocationBytes(421_384), 487_424);
  assert.equal(programAllocationBytes(295_688), 344_064);
});
test("rejects missing or implausible binary sizes", () => {
  for (const size of [0, -1, 99_999, 5_000_001, 1.5, NaN]) {
    assert.throws(() => programAllocationBytes(size), /Unexpected ELF/);
  }
});

