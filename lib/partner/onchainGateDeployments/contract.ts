// Canonical verified onchain gate deployment registry. Partners deploy; Abraxas verifies.

export const ONCHAIN_GATE_DEPLOYMENT_SCHEMA_VERSION = 1 as const;
export const ONCHAIN_GATE_DEPLOYMENT_VERSION = "1.0.0" as const;

export const ONCHAIN_GATE_TYPES = ["evm", "solana"] as const;
export type OnchainGateType = (typeof ONCHAIN_GATE_TYPES)[number];

export const ONCHAIN_GATE_DEPLOYMENT_STATUSES = [
  "submitted",
  "verified_sandbox",
  "needs_correction",
  "production_review_required",
  "verified_production",
  "signer_update_required",
  "signer_revoked",
  "revoked",
] as const;
export type OnchainGateDeploymentStatus = (typeof ONCHAIN_GATE_DEPLOYMENT_STATUSES)[number];

export const ONCHAIN_GATE_SAFE_STATES = [
  "no_deployment_registered",
  "awaiting_verification",
  "verified_sandbox",
  "production_review_required",
  "signer_update_required",
  "unavailable",
] as const;
export type OnchainGateSafeState = (typeof ONCHAIN_GATE_SAFE_STATES)[number];

export const ONCHAIN_GATE_SUBJECT_MODES = ["not_attached", "optional", "required"] as const;
export type OnchainGateSubjectMode = (typeof ONCHAIN_GATE_SUBJECT_MODES)[number];

export const ONCHAIN_GATE_SAFE_REASONS = [
  "permitted",
  "invalid",
  "unknown_field",
  "forbidden_field",
  "tenant_mismatch",
  "application_mismatch",
  "policy_mismatch",
  "action_mismatch",
  "environment_mismatch",
  "network_disabled",
  "unsupported_gate",
  "manifest_tampered",
  "code_hash_mismatch",
  "config_digest_mismatch",
  "program_mismatch",
  "gate_config_mismatch",
  "deployment_verification_unavailable",
  "institutional_required",
  "deployment_not_verified",
  "deployment_revoked",
  "deployment_mismatch",
  "production_review_required",
  "store_unavailable",
  "unauthorized",
] as const;
export type OnchainGateSafeReason = (typeof ONCHAIN_GATE_SAFE_REASONS)[number];

export const EVM_DEPLOYMENT_MANIFEST_FIELDS = [
  "schema_version",
  "gate_type",
  "network_id",
  "chain_id",
  "gate_address",
  "bytecode_hash",
  "config_digest",
  "partner_hash",
  "policy_hash",
  "action_hash",
  "action_type",
  "action_scope",
  "environment",
  "signer_key_id",
  "subject_binding_mode",
] as const;

export const SOLANA_DEPLOYMENT_MANIFEST_FIELDS = [
  "schema_version",
  "gate_type",
  "network_id",
  "program_id",
  "gate_config_pda",
  "program_digest",
  "config_digest",
  "partner_hash",
  "policy_hash",
  "action_hash",
  "action_type",
  "action_scope",
  "environment",
  "signer_key_id",
  "subject_binding_mode",
] as const;

export const ONCHAIN_GATE_FORBIDDEN_KEYS = [
  "rpc",
  "rpc_url",
  "api_key",
  "private_key",
  "signing_key",
  "mnemonic",
  "receipt",
  "receipt_id",
  "claims",
  "evidence",
  "wallet_private_key",
  "callback",
  "callback_url",
  "provider",
  "transaction",
  "tx",
  "calldata",
  "signature",
  "usdc",
  "circle",
  "amount",
  "recipient",
  "live",
] as const;

export const ONCHAIN_GATE_CLIENT_AUTHORITY_KEYS = [
  "verifying_contract",
  "chain_id",
  "gate_address",
  "program_id",
  "gate_config_pda",
  "partner_id",
  "policy_id",
  "policy_version",
  "environment",
  "signer",
  "signer_key_id",
  "private_key",
  "rpc",
  "rpc_url",
  "from_browser",
  "require_institutional",
  "institutionalRequired",
  "institutional_required",
  "institutional_class",
  "schema_version",
  "organization_commitment",
  "actor_commitment",
  "institutional_result_category",
  "action_type",
  "action_scope",
  "network_id",
  "config_digest",
  "program_digest",
  "status",
  "deployment_status",
] as const;

export const ONCHAIN_GATE_NOT_DEPLOYER =
  "Abraxas registers and verifies a partner-owned gate. It never deploys, upgrades, calls, funds, or broadcasts to that gate.";

export const ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV = "ABRAXAS_ONCHAIN_DEPLOYMENT_TEST_ADAPTER" as const;
