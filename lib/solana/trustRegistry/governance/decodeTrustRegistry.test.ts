import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  decodeTrustRegistryGovernance,
  deriveGovernanceMigrationUiState,
  type DecodedTrustRegistryGovernance,
} from "@/lib/solana/trustRegistry/governance/decodeTrustRegistry";
import {
  TRUST_REGISTRY_EXTENDED_ACCOUNT_DATA_LEN,
  TRUST_REGISTRY_LEGACY_ACCOUNT_DATA_LEN,
} from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl536";

const U64_MAX = BigInt("18446744073709551615");

function writeExtendedRegistryTail(
  buf: Buffer,
  params: {
    pendingGovernance?: PublicKey;
    pendingTransferSeq?: bigint;
    pendingExpiresAtSlot?: bigint;
    governanceTransferSeq?: bigint;
  },
) {
  const bodyStart = 8;
  const tailStart = bodyStart + 463;
  if (params.pendingGovernance) {
    params.pendingGovernance.toBuffer().copy(buf, tailStart);
  }
  if (params.pendingTransferSeq != null) {
    buf.writeBigUInt64LE(params.pendingTransferSeq, tailStart + 32);
  }
  if (params.pendingExpiresAtSlot != null) {
    buf.writeBigUInt64LE(params.pendingExpiresAtSlot, tailStart + 40);
  }
  if (params.governanceTransferSeq != null) {
    buf.writeBigUInt64LE(params.governanceTransferSeq, tailStart + 48);
  }
}

function extendedRegistryBuffer(tail: Parameters<typeof writeExtendedRegistryTail>[1]): Buffer {
  const buf = Buffer.alloc(TRUST_REGISTRY_EXTENDED_ACCOUNT_DATA_LEN);
  buf.writeUInt8(1, 0);
  Keypair.generate().publicKey.toBuffer().copy(buf, 8);
  writeExtendedRegistryTail(buf, tail);
  return buf;
}

describe("decodeTrustRegistryGovernance", () => {
  it("classifies legacy v535 account length", () => {
    const buf = Buffer.alloc(TRUST_REGISTRY_LEGACY_ACCOUNT_DATA_LEN);
    buf.writeUInt8(1, 0);
    const decoded = decodeTrustRegistryGovernance(buf);
    expect(decoded.layout).toBe("legacy_v535");
    expect(decoded.pendingGovernance).toBeNull();
    expect(decoded.governanceTransferSeq).toBeNull();
    expect(deriveGovernanceMigrationUiState(decoded, BigInt(0))).toBe("layout_legacy_ops_safe");
  });

  it("classifies extended layout with zero governance transfer seq as ready", () => {
    const decoded = decodeTrustRegistryGovernance(
      extendedRegistryBuffer({ governanceTransferSeq: BigInt(0) }),
    );
    expect(decoded.layout).toBe("extended_governance");
    expect(decoded.governanceTransferSeq).toBe(BigInt(0));
    expect(deriveGovernanceMigrationUiState(decoded, BigInt(0))).toBe("layout_extended_ready");
  });

  it("classifies nonzero governance transfer seq as migration finalized", () => {
    const decoded = decodeTrustRegistryGovernance(
      extendedRegistryBuffer({ governanceTransferSeq: BigInt(1) }),
    );
    expect(decoded.governanceTransferSeq).toBe(BigInt(1));
    expect(deriveGovernanceMigrationUiState(decoded, BigInt(0))).toBe("migration_finalized");
  });

  it("preserves maximum u64 governance transfer seq without Number coercion", () => {
    const decoded = decodeTrustRegistryGovernance(
      extendedRegistryBuffer({ governanceTransferSeq: U64_MAX }),
    );
    expect(decoded.governanceTransferSeq).toBe(U64_MAX);
    expect(deriveGovernanceMigrationUiState(decoded, BigInt(0))).toBe("migration_finalized");
  });

  it("detects nomination pending before expiry slot", () => {
    const pending = Keypair.generate().publicKey;
    const decoded = decodeTrustRegistryGovernance(
      extendedRegistryBuffer({
        pendingGovernance: pending,
        pendingTransferSeq: BigInt(2),
        pendingExpiresAtSlot: BigInt(1000),
        governanceTransferSeq: BigInt(0),
      }),
    );
    expect(decoded.pendingGovernance).toBe(pending.toBase58());
    expect(deriveGovernanceMigrationUiState(decoded, BigInt(999))).toBe("nomination_pending");
  });

  it("detects nomination expired when now slot exceeds pending expiry", () => {
    const pending = Keypair.generate().publicKey;
    const decoded = decodeTrustRegistryGovernance(
      extendedRegistryBuffer({
        pendingGovernance: pending,
        pendingExpiresAtSlot: BigInt(50),
      }),
    );
    expect(deriveGovernanceMigrationUiState(decoded, BigInt(51))).toBe("nomination_expired_blocked");
  });

  it("marks unknown length accounts without throwing", () => {
    const buf = Buffer.alloc(TRUST_REGISTRY_LEGACY_ACCOUNT_DATA_LEN + 1);
    const decoded = decodeTrustRegistryGovernance(buf);
    expect(decoded.layout).toBe("unknown");
    expect(deriveGovernanceMigrationUiState(decoded as DecodedTrustRegistryGovernance, BigInt(0))).toBe(
      "layout_extended_ready",
    );
  });
});
