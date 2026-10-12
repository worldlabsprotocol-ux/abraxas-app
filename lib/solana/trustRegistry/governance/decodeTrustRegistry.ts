import { PublicKey } from "@solana/web3.js";
import {
  TRUST_REGISTRY_EXTENDED_ACCOUNT_DATA_LEN,
  TRUST_REGISTRY_LEGACY_ACCOUNT_DATA_LEN,
} from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl536";

export type TrustRegistryLayout = "legacy_v535" | "extended_governance" | "unknown";

export type DecodedTrustRegistryGovernance = {
  layout: TrustRegistryLayout;
  governanceAuthority: string;
  registryDomainHex: string;
  sequenceEpoch: bigint;
  bump: number;
  pendingGovernance: string | null;
  pendingTransferSeq: bigint | null;
  pendingExpiresAtSlot: bigint | null;
  governanceTransferSeq: bigint | null;
};

function readPubkey(data: Buffer, offset: number): PublicKey {
  return new PublicKey(data.subarray(offset, offset + 32));
}

/** Off-chain decoder for registry account bytes (no RPC). */
export function decodeTrustRegistryGovernance(data: Buffer): DecodedTrustRegistryGovernance {
  const layout: TrustRegistryLayout =
    data.length === TRUST_REGISTRY_LEGACY_ACCOUNT_DATA_LEN
      ? "legacy_v535"
      : data.length === TRUST_REGISTRY_EXTENDED_ACCOUNT_DATA_LEN
        ? "extended_governance"
        : "unknown";

  const body = data.subarray(8);
  const governanceAuthority = readPubkey(data, 8).toBase58();
  const registryDomainHex = body.subarray(32, 64).toString("hex");
  const sequenceEpoch = body.readBigUInt64LE(64);
  const bump = body.readUInt8(72);

  if (layout !== "extended_governance") {
    return {
      layout,
      governanceAuthority,
      registryDomainHex,
      sequenceEpoch,
      bump,
      pendingGovernance: null,
      pendingTransferSeq: null,
      pendingExpiresAtSlot: null,
      governanceTransferSeq: null,
    };
  }

  const tail = body.subarray(463);
  const pendingGovernance = new PublicKey(tail.subarray(0, 32));
  const pendingTransferSeq = tail.readBigUInt64LE(32);
  const pendingExpiresAtSlot = tail.readBigUInt64LE(40);
  const governanceTransferSeq = tail.readBigUInt64LE(48);

  return {
    layout,
    governanceAuthority,
    registryDomainHex,
    sequenceEpoch,
    bump,
    pendingGovernance: pendingGovernance.equals(PublicKey.default) ? null : pendingGovernance.toBase58(),
    pendingTransferSeq,
    pendingExpiresAtSlot,
    governanceTransferSeq,
  };
}

export type GovernanceMigrationUiState =
  | "deployed_authority_active"
  | "layout_legacy_ops_safe"
  | "layout_extended_ready"
  | "nomination_pending"
  | "nomination_expired_blocked"
  | "migration_finalized"
  | "blocked_unverified_destination";

export function deriveGovernanceMigrationUiState(
  decoded: DecodedTrustRegistryGovernance,
  nowSlot: bigint,
): GovernanceMigrationUiState {
  if (decoded.layout === "legacy_v535") return "layout_legacy_ops_safe";
  if (decoded.pendingGovernance) {
    if (decoded.pendingExpiresAtSlot != null && nowSlot > decoded.pendingExpiresAtSlot) {
      return "nomination_expired_blocked";
    }
    return "nomination_pending";
  }
  if (decoded.governanceTransferSeq != null && decoded.governanceTransferSeq > 0n) {
    return "migration_finalized";
  }
  return "layout_extended_ready";
}
