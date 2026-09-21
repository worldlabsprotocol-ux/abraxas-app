import type {
  OnchainGateDeploymentStatus,
  OnchainGateSubjectMode,
  OnchainGateType,
} from "./contract";

export interface EvmDeploymentManifest {
  schema_version: 1;
  gate_type: "evm";
  network_id: string;
  chain_id: number;
  gate_address: `0x${string}`;
  bytecode_hash: `0x${string}`;
  config_digest: `0x${string}`;
  partner_hash: `0x${string}`;
  policy_hash: `0x${string}`;
  action_hash: `0x${string}`;
  action_type: string;
  action_scope: string;
  environment: "sandbox" | "production";
  signer_key_id: string;
  subject_binding_mode: OnchainGateSubjectMode;
}

export interface SolanaDeploymentManifest {
  schema_version: 1;
  gate_type: "solana";
  network_id: string;
  program_id: string;
  gate_config_pda: string;
  program_digest: `0x${string}`;
  config_digest: `0x${string}`;
  partner_hash: `0x${string}`;
  policy_hash: `0x${string}`;
  action_hash: `0x${string}`;
  action_type: string;
  action_scope: string;
  environment: "sandbox" | "production";
  signer_key_id: string;
  subject_binding_mode: OnchainGateSubjectMode;
}

export type OnchainDeploymentManifest = EvmDeploymentManifest | SolanaDeploymentManifest;

export interface OnchainGateDeploymentRecord {
  deployment_ref: string;
  partner_id: string;
  application_id: string;
  gate_type: OnchainGateType;
  network_id: string;
  chain_id: number | null;
  gate_address: string | null;
  bytecode_hash: string | null;
  config_digest: string;
  program_id: string | null;
  gate_config_pda: string | null;
  program_digest: string | null;
  partner_hash: string;
  policy_hash: string;
  action_hash: string;
  action_type: string;
  action_scope: string;
  environment: "sandbox" | "production";
  signer_key_id: string;
  subject_binding_mode: OnchainGateSubjectMode;
  status: OnchainGateDeploymentStatus;
  require_institutional: boolean;
  production_reviewed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnchainGatePublicView {
  deployment_ref: string;
  gate_type: OnchainGateType;
  network_id: string;
  chain_id: number | null;
  gate_address: string | null;
  bytecode_hash: string | null;
  config_digest: string;
  program_id: string | null;
  gate_config_pda: string | null;
  program_digest: string | null;
  partner_hash: string;
  policy_hash: string;
  action_hash: string;
  environment: "sandbox" | "production";
  signer_key_id: string;
  subject_binding_mode: OnchainGateSubjectMode;
  status: OnchainGateDeploymentStatus;
  safe_status: string;
  require_institutional: boolean;
  institutional_class: "institutional_v2" | "standard";
  institutional_label: string;
  live: false;
  deploys: false;
  circle_settlement: false;
}
