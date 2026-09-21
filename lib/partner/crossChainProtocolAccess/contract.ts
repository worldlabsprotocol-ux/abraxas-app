// FILE: lib/partner/crossChainProtocolAccess/contract.ts
// Cross-chain partner action reference. Named feature access only. Never executes.

export const CROSS_CHAIN_PROTOCOL_ACTION = "activate_protocol_access" as const;
export const CROSS_CHAIN_PROTOCOL_SCOPE = "sandbox:protocol_access" as const;
export const CROSS_CHAIN_PROTOCOL_DOCS = "/docs/cross-chain-protocol-access" as const;
export const CROSS_CHAIN_PROTOCOL_VERSION = "1.0.0" as const;

export const CROSS_CHAIN_PROTOCOL_NOTICE =
  "Private proof → fresh consent → audience-bound receipt → server re-check → one-time chain authorization → partner-owned activate_protocol_access. Local/sandbox reference only. A presentation is never sufficient. Abraxas does not transfer tokens, mint, approve spending, route orders, settle payments, or custody funds.";

export const CROSS_CHAIN_PROTOCOL_NO_FUNDS =
  "The reference integrations record a boolean entitlement only. They have no payable fallback, token accounts, token program calls, wallet creation, transaction signing, RPC, or deployment action.";

export const CROSS_CHAIN_PROTOCOL_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "action_binding",
  "expires_at",
  "schema_version",
  "network_id",
  "environment",
  "presentation_sufficient",
  "encoding",
] as const;

export const CROSS_CHAIN_PROTOCOL_FORBIDDEN_KEYS = [
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
  "email",
  "date_of_birth",
  "pii",
  "proof",
  "signature",
  "raw_signature",
] as const;

export const CROSS_CHAIN_PROTOCOL_CLIENT_OVERRIDE_KEYS = [
  "chain",
  "chain_id",
  "contract",
  "program",
  "program_id",
  "receipt",
  "receipt_id",
  "policy",
  "policy_id",
  "action",
  "signer",
  "nonce",
  "expiry",
  "entitlement",
  "network_id",
  "verifying_contract",
  "gate_address",
  "rpc",
  "rpc_url",
] as const;

export const CROSS_CHAIN_PROTOCOL_EVM_INTERFACE = {
  contract: "AbraxasProtocolAccess",
  method: "activateProtocolAccess",
  gate: "AbraxasPartnerEligibilityGate.consumeEligibility",
  named_action: CROSS_CHAIN_PROTOCOL_ACTION,
} as const;

export const CROSS_CHAIN_PROTOCOL_SOLANA_INTERFACE = {
  program: "abraxas_protocol_access",
  instruction: "activate_protocol_access",
  gate: "abraxas_eligibility_gate.authorize + consume",
  named_action: CROSS_CHAIN_PROTOCOL_ACTION,
  program_id_local: "GD237h8oAdsR89Ga8W6P8PtNcu13hvbvFsLgWtZyHrqB",
} as const;
