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

export const INSTITUTIONAL_TESTNET_GATE_COMMANDS = [
  "plan institutional-evm-sepolia",
  "plan institutional-solana-devnet",
  "validate-plan <plan-file>",
  "deploy institutional-evm-sepolia --confirm",
  "deploy institutional-solana-devnet --confirm",
  "verify <registry-manifest>",
  "register <registry-manifest>",
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
  public_verifier: "ABRAXAS_GATE_PUBLIC_VERIFIER",
  handoff_path: "ABRAXAS_GATE_HANDOFF_PATH",
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

export const INSTITUTIONAL_TESTNET_GATE_NOTICE =
  "Institutional V2 testnet kit. A reusable gate requires V2 institutional attestations. Organization, actor, result-category, subject, and expiry are attestation-only — never deployment-static. Plan, validate-plan, then the operator deploys with a local Solana toolchain. --confirm never broadcasts. Verify and register need a post-deploy registry manifest plus chain observation. No browser deploy button. Not Utila, live KYB, Arc, or Mainnet.";

export const TESTNET_GATE_NO_FUNDS =
  "This kit deploys partner-owned eligibility gates only. It does not transfer tokens, mint, approve spending, settle USDC, call Circle, or custody funds.";

export const TESTNET_GATE_FORBIDDEN_NETWORKS = [
  "evm_mainnet",
  "solana_mainnet",
  "arc_circle_mainnet",
] as const;
