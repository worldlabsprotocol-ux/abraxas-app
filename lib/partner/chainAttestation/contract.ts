// FILE: lib/partner/chainAttestation/contract.ts
// Canonical Chain Eligibility Attestation. Hashes only. Never executes.

import { EVM_PARTNER_ACTION_TYPES, EVM_PARTNER_TYPE_SCOPES } from "@/lib/partner/evm/contract";
import { PORTABLE_ACTION_NOT_EXECUTION } from "@/lib/partner/portableActionContract/contract";

export const CHAIN_ATTESTATION_SCHEMA_VERSION = 2 as const;
export const CHAIN_ATTESTATION_VERSION = "2.0.0" as const;

export const EIP712_DOMAIN_NAME = "AbraxasEligibilityVerifier" as const;
export const EIP712_DOMAIN_VERSION = "2" as const;

export const EIP712_DOMAIN_TYPE = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
  { name: "partnerHash", type: "bytes32" },
] as const;

export const EIP712_ATTESTATION_TYPE = [
  { name: "schemaVersion", type: "uint256" },
  { name: "networkId", type: "bytes32" },
  { name: "partnerHash", type: "bytes32" },
  { name: "policyHash", type: "bytes32" },
  { name: "actionHash", type: "bytes32" },
  { name: "subjectHash", type: "bytes32" },
  { name: "issuedAt", type: "uint64" },
  { name: "expiresAt", type: "uint64" },
  { name: "nonce", type: "bytes32" },
  { name: "attestationId", type: "bytes32" },
  { name: "environment", type: "bytes32" },
  { name: "signerKeyId", type: "bytes32" },
  { name: "organizationCommitment", type: "bytes32" },
  { name: "actorCommitment", type: "bytes32" },
  { name: "institutionalResultCategory", type: "bytes32" },
] as const;

export const EIP712_PRIMARY_TYPE = "ChainEligibilityAttestation" as const;

export const CHAIN_ATTESTATION_EVM_ACTIONS = EVM_PARTNER_ACTION_TYPES;
export const CHAIN_ATTESTATION_EVM_TYPE_SCOPES = EVM_PARTNER_TYPE_SCOPES;

export const CHAIN_ATTESTATION_SOLANA_ACTIONS = ["partner_protocol_action"] as const;
export const CHAIN_ATTESTATION_SOLANA_SCOPE = "sandbox:partner_protocol" as const;

export const CHAIN_ATTESTATION_EVM_NETWORKS = ["evm_sandbox", "evm_sepolia", "evm_mainnet"] as const;
export const CHAIN_ATTESTATION_SOLANA_NETWORKS = ["solana_devnet", "solana_mainnet"] as const;

export const SOLANA_ATTESTATION_MESSAGE_PREFIX = "ABRAXAS_CHAIN_ELIGIBILITY_V2" as const;
export const SOLANA_ATTESTATION_MESSAGE_LEN = 468 as const;

export const ZERO_BYTES32 = `0x${"00".repeat(32)}` as const;

export const CHAIN_ATTESTATION_ENVIRONMENTS = ["sandbox", "production"] as const;
export type ChainAttestationEnvironment = (typeof CHAIN_ATTESTATION_ENVIRONMENTS)[number];

export const CHAIN_ATTESTATION_SAFE_REASONS = [
  "permitted",
  "attestation_unavailable",
  "policy_denied",
  "receipt_expired",
  "receipt_revoked",
  "partner_mismatch",
  "policy_mismatch",
  "environment_mismatch",
  "action_mismatch",
  "network_disabled",
  "production_review_required",
  "wallet_binding_missing",
  "replayed",
  "expired",
  "store_unavailable",
  "unauthorized",
  "invalid",
  "deployment_verification_unavailable",
  "deployment_not_verified",
  "deployment_revoked",
  "deployment_mismatch",
  "unknown_key",
  "signer_revoked",
  "signer_update_required",
  "schema_mismatch",
  "organization_revoked",
  "wallet_binding_mismatch",
  "issuer_mapping_required",
  "consent_required",
  "institutional_required",
] as const;
export type ChainAttestationSafeReason = (typeof CHAIN_ATTESTATION_SAFE_REASONS)[number];

export const CHAIN_ATTESTATION_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "action_binding",
  "expires_at",
  "schema_version",
  "network_id",
  "environment",
] as const;

export const CHAIN_ATTESTATION_PARTNER_VISIBLE_KEYS = [
  ...CHAIN_ATTESTATION_CLIENT_VISIBLE_KEYS,
  "attestation_id",
  "typed_data",
  "signature",
  "solana_message",
  "solana_signature",
  "encoding",
] as const;

export const CHAIN_ATTESTATION_FORBIDDEN_KEYS = [
  "private_key",
  "signing_key",
  "mnemonic",
  "receipt",
  "receipt_id",
  "claims",
  "evidence",
  "source_facts",
  "callback",
  "callback_url",
  "api_key",
  "wallet_private_key",
  "transaction",
  "tx",
  "calldata",
  "recipient",
  "amount",
  "provider",
  "rpc",
  "rpc_url",
  "legal_name",
  "beneficial_owner",
  "ubo",
  "incorporation",
  "email",
  "date_of_birth",
  "pii",
] as const;

export const CHAIN_ATTESTATION_CLIENT_OVERRIDE_KEYS = [
  "partner_id",
  "policy_id",
  "policy_version",
  "environment",
  "signer",
  "signer_key_id",
  "private_key",
  "nonce",
  "attestation_id",
  "issued_at",
  "expires_at",
  "from_browser",
  "client_issued",
  "activate_production",
  "production_key",
  "rpc",
  "rpc_url",
  "calldata",
  "recipient",
  "amount",
  "transaction",
  "tx",
  "execute",
  "wallet_address",
  "api_key",
  "verifying_contract",
  "chain_id",
  "gate_address",
  "program_id",
  "organization_commitment",
  "actor_commitment",
  "institutional_result_category",
  "organization_ref",
  "actor_ref",
  "organization_binding_hash",
] as const;

export const CHAIN_ATTESTATION_NOT_EXECUTION =
  "A valid attestation is a short-lived eligibility authorization. It is not a payment, transfer, trade, token approval, gas authorization, or transaction.";

export const CHAIN_ATTESTATION_BOUNDARY =
  "Holder proves a narrow result privately. Abraxas issues a short-lived signed authorization. The partner’s own contract or program verifies it. The partner’s own code chooses what action to allow. Abraxas never submits transactions, custodies funds, routes orders, executes payments, or deploys a shared execution contract.";

export const CHAIN_ATTESTATION_FLOW =
  `${PORTABLE_ACTION_NOT_EXECUTION} ${CHAIN_ATTESTATION_NOT_EXECUTION} ${CHAIN_ATTESTATION_BOUNDARY}`;

export const CHAIN_ATTESTATION_PRIVACY = [
  "Canonical fields are hashes and timestamps only.",
  "No PII, evidence, claims, receipt contents, source facts, callback URL, API key, wallet private key, transaction payload, recipient, amount, calldata, or provider data.",
  "Launchpad and browser views never receive signatures, verifying-contract addresses, or signer material.",
] as const;

export interface ChainEligibilityAttestationFields {
  schemaVersion: typeof CHAIN_ATTESTATION_SCHEMA_VERSION;
  networkId: `0x${string}`;
  partnerHash: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  subjectHash: `0x${string}`;
  issuedAt: number;
  expiresAt: number;
  nonce: `0x${string}`;
  attestationId: `0x${string}`;
  environment: `0x${string}`;
  signerKeyId: `0x${string}`;
  organizationCommitment: `0x${string}`;
  actorCommitment: `0x${string}`;
  institutionalResultCategory: `0x${string}`;
}

export interface Eip712Domain {
  name: typeof EIP712_DOMAIN_NAME;
  version: typeof EIP712_DOMAIN_VERSION;
  chainId: number;
  verifyingContract: `0x${string}`;
  partnerHash: `0x${string}`;
}

export function isChainAttestationEvmAction(value: string): boolean {
  return (CHAIN_ATTESTATION_EVM_ACTIONS as readonly string[]).includes(value);
}

export function isChainAttestationEvmNetwork(value: string): boolean {
  return (CHAIN_ATTESTATION_EVM_NETWORKS as readonly string[]).includes(value);
}

export function isChainAttestationSolanaNetwork(value: string): boolean {
  return (CHAIN_ATTESTATION_SOLANA_NETWORKS as readonly string[]).includes(value);
}

