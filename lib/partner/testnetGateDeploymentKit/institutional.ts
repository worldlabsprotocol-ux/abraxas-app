// V2 institutional gate plan/verify helpers. Opaque hashes only. No PII.

import { concat, keccak256, pad, toHex } from "viem";
import { utf8Bytes as stringToBytes } from "@/lib/partner/chainAttestation/utf8";
import { hashUtf8, hashSignerKeyId } from "@/lib/partner/chainAttestation/hashes";
import { ZERO_BYTES32 } from "@/lib/partner/chainAttestation/contract";
import { LOCALNET_SOLANA_PROGRAM_IDS } from "./contract";

export const INSTITUTIONAL_ATTESTATION_SCHEMA = "2" as const;
export const INSTITUTIONAL_EIP712_VERSION = "2" as const;
export const INSTITUTIONAL_SOLANA_PREFIX = "ABRAXAS_CHAIN_ELIGIBILITY_V2" as const;
export const INSTITUTIONAL_SOLANA_MESSAGE_LEN = 468 as const;
export const INSTITUTIONAL_SOLANA_LEGACY_LEN = 372 as const;

export const INSTITUTIONAL_V2_TYPESTRING =
  "ChainEligibilityAttestation(uint256 schemaVersion,bytes32 networkId,bytes32 partnerHash,bytes32 policyHash,bytes32 actionHash,bytes32 subjectHash,uint64 issuedAt,uint64 expiresAt,bytes32 nonce,bytes32 attestationId,bytes32 environment,bytes32 signerKeyId,bytes32 organizationCommitment,bytes32 actorCommitment,bytes32 institutionalResultCategory)" as const;

export const INSTITUTIONAL_SEQUENCE = [
  "Institutional policy review required",
  "Create V2 testnet deployment plan",
  "Human deploys gate",
  "Verify exact deployed configuration",
  "Register verified sandbox deployment",
  "Request a fresh institutional presentation and chain attestation",
] as const;

export const INSTITUTIONAL_FORBIDDEN_MANIFEST_KEYS = [
  "legal_name",
  "legal_entity",
  "documents",
  "beneficial_owner",
  "ubo",
  "wallet_address",
  "private_key",
  "rpc_url",
  "rpc",
  "provider",
  "receipt",
  "receipt_id",
  "signature",
  "callback_url",
  "callback",
  "transaction",
  "calldata",
  "amount",
  "utila",
] as const;

export function organizationCommitment(ref: string): `0x${string}` {
  const value = ref.trim();
  if (!value || value.startsWith("YOUR_")) return ZERO_BYTES32;
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) return value.toLowerCase() as `0x${string}`;
  return hashUtf8(value);
}

export function actorCommitment(ref: string): `0x${string}` {
  return organizationCommitment(ref);
}

export function institutionalResultCategoryHash(category: string): `0x${string}` {
  const value = category.trim();
  if (!value || value.startsWith("YOUR_")) return ZERO_BYTES32;
  return hashUtf8(value);
}

export function institutionalTypehash(): `0x${string}` {
  return keccak256(stringToBytes(INSTITUTIONAL_V2_TYPESTRING));
}

export function institutionalBytecodeDigest(gateType: "evm" | "solana"): `0x${string}` {
  return keccak256(stringToBytes(`institutional-v2:${gateType}:${INSTITUTIONAL_V2_TYPESTRING}`));
}

export function institutionalConfigDigest(input: {
  gateType: "evm" | "solana";
  networkId: string;
  chainId: number | null;
  partnerHash: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  environmentHash: `0x${string}`;
  signerKeyId: string;
  publicVerifier: string;
}): `0x${string}` {
  return keccak256(concat([
    keccak256(stringToBytes(input.gateType)),
    keccak256(stringToBytes(input.networkId)),
    pad(toHex(input.chainId ?? 0), { size: 32 }),
    input.partnerHash,
    input.policyHash,
    input.actionHash,
    input.environmentHash,
    hashSignerKeyId(input.signerKeyId),
    keccak256(stringToBytes(input.publicVerifier.trim() || "unspecified")),
    keccak256(stringToBytes("require_institutional")),
    institutionalTypehash(),
  ]));
}

export function institutionalSolanaLayout() {
  return {
    prefix: INSTITUTIONAL_SOLANA_PREFIX,
    message_len: INSTITUTIONAL_SOLANA_MESSAGE_LEN,
    legacy_rejected_len: INSTITUTIONAL_SOLANA_LEGACY_LEN,
    schema_version: 2 as const,
    gate_program_id: LOCALNET_SOLANA_PROGRAM_IDS.abraxas_eligibility_gate,
    protocol_program_id: LOCALNET_SOLANA_PROGRAM_IDS.abraxas_protocol_access,
    pdas: {
      gate_config: ["gate_config", "admin"],
      authorization: ["authorization", "config", "attestation_id"],
      entitlement: ["protocol_access", "protocol", "subject_hash", "organization_commitment"],
    },
    gate_config_expected_commitments: "zero_reusable" as const,
    attestation_checked_on_authorize: [
      "organization_commitment",
      "actor_commitment",
      "institutional_result_category",
      "subject_hash",
      "expires_at",
    ] as const,
    live: false as const,
    require_institutional: true as const,
    institutional_capable: true as const,
  };
}

export function solanaInstitutionalProgramIsV1Only(input: {
  message_len?: number;
  schema_version?: number;
  prefix?: string;
  require_institutional?: boolean;
  institutional_capable?: boolean;
}): boolean {
  return input.message_len === INSTITUTIONAL_SOLANA_LEGACY_LEN
    || input.schema_version === 1
    || input.prefix === "ABRAXAS_CHAIN_ELIGIBILITY_V1"
    || input.require_institutional === false
    || input.institutional_capable === false;
}

export function institutionalEnvelopeLeaks(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.keys(value as Record<string, unknown>).filter((key) =>
    (INSTITUTIONAL_FORBIDDEN_MANIFEST_KEYS as readonly string[]).includes(key),
  );
}

export function commitmentsComplete(input: {
  organization_commitment: string;
  actor_commitment: string;
  institutional_result_category_hash: string;
}): boolean {
  return [input.organization_commitment, input.actor_commitment, input.institutional_result_category_hash]
    .every((item) => /^0x[0-9a-fA-F]{64}$/.test(item) && item.toLowerCase() !== ZERO_BYTES32);
}
