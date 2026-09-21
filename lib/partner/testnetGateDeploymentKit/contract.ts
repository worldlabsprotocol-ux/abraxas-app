// Human-operated Solana devnet / EVM testnet gate deployment kit.
// Abraxas never deploys from Vercel, API routes, CI, or the browser.

export const TESTNET_GATE_KIT_VERSION = "1.0.0" as const;
export const TESTNET_GATE_KIT_SCHEMA_VERSION = 1 as const;
export const TESTNET_GATE_CLI = "abraxas-gate" as const;
export const TESTNET_GATE_DOCS = "/docs/testnet-gate-deployment" as const;

export const TESTNET_GATE_COMMANDS = [
  "plan solana",
  "plan evm",
  "deploy solana-devnet",
  "deploy evm-testnet",
  "verify <deployment-manifest>",
  "register <deployment-manifest>",
] as const;

export const TESTNET_GATE_SAFE_STATES = [
  "not_planned",
  "ready_to_plan",
  "deployment_pending_verification",
  "verified_sandbox",
] as const;
export type TestnetGateSafeState = (typeof TESTNET_GATE_SAFE_STATES)[number];

export const TESTNET_GATE_ENV_NAMES = {
  partner_id: "ABRAXAS_GATE_PARTNER_ID",
  application_id: "ABRAXAS_GATE_APPLICATION_ID",
  policy_id: "ABRAXAS_GATE_POLICY_ID",
  policy_version: "ABRAXAS_GATE_POLICY_VERSION",
  signer_key_id: "ABRAXAS_GATE_SIGNER_KEY_ID",
  evm_rpc: "ABRAXAS_GATE_EVM_RPC_URL",
  evm_key: "ABRAXAS_GATE_EVM_PRIVATE_KEY",
  evm_verify_rpc: "ABRAXAS_EVM_GATE_VERIFY_RPC_URL",
  solana_rpc: "ABRAXAS_GATE_SOLANA_RPC_URL",
  solana_keypair: "ABRAXAS_GATE_SOLANA_KEYPAIR",
  solana_verify_rpc: "ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL",
} as const;

export const APPROVED_EVM_TESTNET_ID = "evm_sepolia" as const;
export const APPROVED_EVM_TESTNET_CHAIN_ID = 11155111 as const;
export const APPROVED_SOLANA_TESTNET_ID = "solana_devnet" as const;

export const LOCALNET_SOLANA_PROGRAM_IDS = {
  abraxas_eligibility_gate: "GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB",
  abraxas_protocol_access: "GD237h8oAdsR89Ga8W6P8PtNcu13hvbvFsLgWtZyHrqB",
  source: "anchor_toml_localnet",
  live: false as const,
} as const;

export const TESTNET_GATE_NOTICE =
  "Human-operated local CLI only. Plan is read-only. Deploy requires --confirm and operator RPC/signer env vars. Never runs from Vercel, API routes, CI, or the browser. Not a live Mainnet, Arc, USDC, or Circle path.";

export const TESTNET_GATE_NO_FUNDS =
  "This kit deploys partner-owned eligibility gates only. It does not transfer tokens, mint, approve spending, settle USDC, call Circle, or custody funds.";

export const TESTNET_GATE_FORBIDDEN_NETWORKS = [
  "evm_mainnet",
  "solana_mainnet",
  "arc_circle_mainnet",
] as const;
