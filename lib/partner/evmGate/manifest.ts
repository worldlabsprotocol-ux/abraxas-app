// Partner-owned EVM gate deployment manifest. Never infers live.

export const EVM_GATE_MANIFEST_SCHEMA_VERSION = 1 as const;
export const EVM_GATE_MANIFEST_STATUSES = ["local_test", "partner_deployed"] as const;
export type EvmGateManifestStatus = (typeof EVM_GATE_MANIFEST_STATUSES)[number];

export const EVM_GATE_MANIFEST_FIELDS = [
  "schema_version",
  "status",
  "network_id",
  "chain_id",
  "gate_address",
  "bytecode_hash",
  "partner_hash",
  "policy_hash",
  "action_hash",
  "environment",
  "signer_key_id",
  "require_subject",
  "create2_salt",
  "predicted_address",
] as const;

export interface EvmGateDeploymentManifest {
  schema_version: typeof EVM_GATE_MANIFEST_SCHEMA_VERSION;
  status: EvmGateManifestStatus;
  network_id: string;
  chain_id: number;
  gate_address: `0x${string}`;
  bytecode_hash: `0x${string}`;
  partner_hash: `0x${string}`;
  policy_hash: `0x${string}`;
  action_hash: `0x${string}`;
  environment: `0x${string}`;
  signer_key_id: string;
  require_subject: boolean;
  create2_salt: `0x${string}` | null;
  predicted_address: `0x${string}` | null;
}

export const EVM_GATE_MANIFEST_FORBIDDEN_KEYS = [
  "live",
  "rpc",
  "rpc_url",
  "private_key",
  "signing_key",
  "api_key",
  "receipt",
  "claims",
  "evidence",
  "provider",
  "wallet_private_key",
  "callback",
  "recipient",
  "amount",
  "calldata",
  "signature",
  "usdc",
  "circle",
] as const;
