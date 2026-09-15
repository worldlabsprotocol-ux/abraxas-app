// FILE: lib/settlement/settlementSigner.server.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  deriveSettlementSignerAddress,
  validateSettlementSignerConfiguration,
} from "@/lib/settlement/settlementSigner.server";

const TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("settlementSigner.server", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY = TEST_KEY;
    delete process.env.ABRAXAS_SETTLEMENT_SIGNING_KEY;
    delete process.env.ARC_DEPLOYER_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("derives signer address from private key", () => {
    const address = deriveSettlementSignerAddress();
    expect(address?.toLowerCase()).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
  });

  it("fails when configured address mismatches derived key", () => {
    process.env.ABRAXAS_SETTLEMENT_SIGNER_ADDRESS = "0x0000000000000000000000000000000000000001";
    const result = validateSettlementSignerConfiguration();
    expect(result.ok).toBe(false);
  });

  it("rejects deployer key reused as settlement signer", () => {
    process.env.ARC_DEPLOYER_PRIVATE_KEY = TEST_KEY;
    const result = validateSettlementSignerConfiguration();
    expect(result.ok).toBe(false);
  });

  it("rejects malformed private keys", () => {
    process.env.ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY = "not-a-key";
    const result = validateSettlementSignerConfiguration();
    expect(result.ok).toBe(false);
  });
});
