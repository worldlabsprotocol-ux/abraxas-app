// FILE: examples/good-trouble-wix/backend/testPkceEscrowFixtures.js
// Test-only 32-byte escrow pepper (64 hex chars).

export const TEST_ESCROW_PEPPER_HEX = `${"a".repeat(64)}`;

/** @param {object} [extra] */
export function withTestEscrowPepperDeps(extra = {}) {
  return {
    pepperOverride: TEST_ESCROW_PEPPER_HEX,
    ...extra,
  };
}
