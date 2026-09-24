import { keccak256, toHex } from "viem";
import { utf8Bytes as stringToBytes } from "@/lib/partner/chainAttestation/utf8";
import {
  CHAIN_ATTESTATION_SCHEMA_VERSION,
  type ChainEligibilityAttestationFields,
} from "@/lib/partner/chainAttestation/contract";
import { eip712Domain, hashChainAttestationTypedData } from "@/lib/partner/chainAttestation/eip712";
import { bytesToHex, encodeSolanaEligibilityMessage } from "@/lib/partner/chainAttestation/solanaMessage";
import { encodeU64Be, hashUtf8 } from "@/lib/partner/chainAttestation/hashes";

const ZERO = (`0x${"00".repeat(32)}`) as `0x${string}`;

function h(label: string): `0x${string}` {
  return hashUtf8(label);
}

export const CONFORMANCE_VECTOR_FIELDS: ChainEligibilityAttestationFields = {
  schemaVersion: CHAIN_ATTESTATION_SCHEMA_VERSION,
  networkId: h("evm_sepolia"),
  partnerHash: h("conformance-partner"),
  policyHash: h("conformance-policy:1"),
  actionHash: h("activate_protocol_access:sandbox:protocol_access"),
  subjectHash: h("subject-binding"),
  issuedAt: 1_700_000_000,
  expiresAt: 2_000_000_000,
  nonce: h("nonce-conformance-1"),
  attestationId: h("attestation-conformance-1"),
  environment: h("sandbox"),
  signerKeyId: h("evm-attestation-test-1"),
  organizationCommitment: h("org-commitment"),
  actorCommitment: h("actor-commitment"),
  institutionalResultCategory: h("organization_eligible"),
};

export const CONFORMANCE_V1_FIELDS = {
  ...CONFORMANCE_VECTOR_FIELDS,
  schemaVersion: 1 as const,
  organizationCommitment: ZERO,
  actorCommitment: ZERO,
  institutionalResultCategory: ZERO,
};

export const CONFORMANCE_EVM_DOMAIN = eip712Domain({
  chainId: 11155111,
  verifyingContract: "0x1111111111111111111111111111111111111111",
  partnerHash: CONFORMANCE_VECTOR_FIELDS.partnerHash,
});

export function evmConformanceDigest(fields = CONFORMANCE_VECTOR_FIELDS): `0x${string}` {
  return hashChainAttestationTypedData(CONFORMANCE_EVM_DOMAIN, fields);
}

export function solanaConformanceMessage(fields = CONFORMANCE_VECTOR_FIELDS): `0x${string}` {
  return bytesToHex(encodeSolanaEligibilityMessage(fields));
}

export function solanaV1LegacyMessage(): Uint8Array {
  const prefix = new TextEncoder().encode("ABRAXAS_CHAIN_ELIGIBILITY_V1");
  const prefixHash = keccak256(stringToBytes("ABRAXAS_CHAIN_ELIGIBILITY_V1"));
  const out = new Uint8Array(372);
  out.set(prefix, 0);
  out.set(hexToArr(prefixHash), 28);
  out.set(encodeU64Be(1), 60);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.networkId), 68);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.partnerHash), 100);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.policyHash), 132);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.actionHash), 164);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.subjectHash), 196);
  out.set(encodeU64Be(CONFORMANCE_V1_FIELDS.issuedAt), 228);
  out.set(encodeU64Be(CONFORMANCE_V1_FIELDS.expiresAt), 236);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.nonce), 244);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.attestationId), 276);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.environment), 308);
  out.set(hexToArr(CONFORMANCE_V1_FIELDS.signerKeyId), 340);
  return out;
}

function hexToArr(hex: string): Uint8Array {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(raw.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export const CONFORMANCE_VECTOR_PACKAGE = {
  version: "1.0.0",
  live: false as const,
  evm: {
    chain_id: 11155111,
    schema_version: 2,
    domain_name: "AbraxasEligibilityVerifier",
    domain_version: "2",
    digest: evmConformanceDigest(),
    fields: CONFORMANCE_VECTOR_FIELDS,
  },
  solana_v2: {
    prefix: "ABRAXAS_CHAIN_ELIGIBILITY_V2",
    message_len: 468,
    schema_version: 2,
    message_hex: solanaConformanceMessage(),
  },
  solana_v1: {
    prefix: "ABRAXAS_CHAIN_ELIGIBILITY_V1",
    message_len: 372,
    schema_version: 1,
    message_hex: toHex(solanaV1LegacyMessage()),
  },
};
