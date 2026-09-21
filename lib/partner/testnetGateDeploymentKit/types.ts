import type { OnchainDeploymentManifest } from "@/lib/partner/onchainGateDeployments/types";
import type { TestnetGateSafeState } from "./contract";

export interface KitBindings {
  partner_id: string;
  application_id: string;
  policy_id: string;
  policy_version: number;
  action_type: "activate_protocol_access";
  action_scope: "sandbox:protocol_access";
  environment: "sandbox";
  signer_key_id: string;
  subject_binding_mode: "required";
}

export interface KitEip712Preview {
  name: "AbraxasEligibilityVerifier";
  version: "1" | "2";
  chain_id: number;
  verifying_contract: `0x${string}` | null;
  partner_hash: `0x${string}`;
}

export interface InstitutionalKitPlan {
  schema_version: "2";
  institutional_required: true;
  organization_commitment: `0x${string}`;
  actor_commitment: `0x${string}`;
  institutional_result_category_hash: `0x${string}`;
  valid_until: number;
  signer_key_id: string;
  public_verifier: string;
  partner_hash: `0x${string}`;
  policy_hash: `0x${string}`;
  action_hash: `0x${string}`;
  environment_hash: `0x${string}`;
  config_digest: `0x${string}`;
  bytecode_digest: `0x${string}`;
  consumer: "expiry_bound_protocol_access";
}

export interface KitCreate2Preview {
  factory: "DeployPartnerGate";
  salt: `0x${string}`;
  predicted_gate: `0x${string}` | null;
}

export interface TestnetGateKitEnvelope {
  kit_schema_version: 1 | 2;
  kit_version: "1.0.0";
  phase: "planned" | "deployed" | "verified";
  live: false;
  deploys_from_browser: false;
  planned_at: string;
  gate_type: "evm" | "solana";
  network_id: string;
  chain_id: number | null;
  bindings: KitBindings;
  partner_hash: `0x${string}`;
  policy_hash: `0x${string}`;
  action_hash: `0x${string}`;
  environment_hash: `0x${string}`;
  create2: KitCreate2Preview | null;
  eip712: KitEip712Preview | null;
  localnet_program_ids: typeof import("./contract").LOCALNET_SOLANA_PROGRAM_IDS | null;
  protocol_program_id: string | null;
  protocol_address: `0x${string}` | null;
  registry_manifest: OnchainDeploymentManifest | null;
  institutional: InstitutionalKitPlan | null;
  solana_v2: ReturnType<typeof import("./institutional").institutionalSolanaLayout> | null;
  kit_digest: `0x${string}`;
}

export interface TestnetReadinessReport {
  deployment_verified: boolean;
  signer_lifecycle_matches: boolean;
  partner_policy_action_match: boolean;
  replay_protection: boolean;
  current_receipt_requirement: boolean;
  production_mainnet_posture: false;
  issuance_unblocked: boolean;
  safe_state: TestnetGateSafeState;
  live: false;
  reasons: string[];
}

export type KitCliResult =
  | { ok: true; command: string; envelope?: TestnetGateKitEnvelope; report?: TestnetReadinessReport; public?: unknown }
  | { ok: false; command: string; reason: string };
