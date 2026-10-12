import { describe, expect, it } from "vitest";
import { decodeTrustRegistryGovernance, deriveGovernanceMigrationUiState } from "@/lib/solana/trustRegistry/governance/decodeTrustRegistry";
import { TRUST_REGISTRY_LEGACY_ACCOUNT_DATA_LEN } from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl536";

describe("decodeTrustRegistryGovernance", () => {
  it("classifies legacy v535 account length", () => {
    const buf = Buffer.alloc(TRUST_REGISTRY_LEGACY_ACCOUNT_DATA_LEN);
    buf.writeUInt8(1, 0); // non-zero discriminator prefix stub
    const decoded = decodeTrustRegistryGovernance(buf);
    expect(decoded.layout).toBe("legacy_v535");
    expect(decoded.pendingGovernance).toBeNull();
    expect(deriveGovernanceMigrationUiState(decoded, 0n)).toBe("layout_legacy_ops_safe");
  });
});
