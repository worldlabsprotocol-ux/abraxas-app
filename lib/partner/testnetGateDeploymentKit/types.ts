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

export const INSTITUTIONAL_ATTESTATION_ONLY_FIELDS = [
  "organization_commitment",
  "actor_commitment",
  "institutional_result_category",
  "subject_hash",
  "issued_at",
  "expires_at",
  "nonce",
  "attestation_id",
] as const;

export interface InstitutionalKitPlan {
  schema_version: "2";
  institutional_required: true;
  require_institutional: true;
  signer_key_id: string;
  public_verifier: string;
  partner_hash: `0x${string}`;
  policy_hash: `0x${string}`;
  action_hash: `0x${string}`;
  environment_hash: `0x${string}`;
  config_digest: `0x${string}`;
  bytecode_digest: `0x${string}`;
  consumer: "expiry_bound_protocol_access";
  attestation_only_fields: typeof INSTITUTIONAL_ATTESTATION_ONLY_FIELDS;
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
  require_institutional: boolean;
  institutional_class: "institutional_v2" | "standard";
  institutional_label: string;
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

export type KitFileKind = "plan_envelope" | "registry_manifest" | "invalid";

export interface OperatorHandoff {
  live: false;
  broadcast: false;
  cluster: "solana_devnet" | "evm_sepolia";
  require_institutional: true;
  institutional_class: "institutional_v2";
  institutional_label: string;
  expected_program_ids?: {
    eligibility_gate: string;
    protocol_access: string;
    source: "anchor_toml_localnet";
  };
  gate_config: {
    require_institutional: true;
    expected_organization_commitment: "0x0000000000000000000000000000000000000000000000000000000000000000";
    expected_actor_commitment: "0x0000000000000000000000000000000000000000000000000000000000000000";
    expected_institutional_result_category: "0x0000000000000000000000000000000000000000000000000000000000000000";
    subject_binding_mode: "required";
    note: "Reusable gate. Organization, actor, category, subject, and expiry are attestation-only.";
  };
  pda_derivation: {
    gate_config: ["gate_config", "admin"];
    authorization: ["authorization", "config", "attestation_id"];
    entitlement: ["protocol_access", "protocol", "subject_hash", "organization_commitment"];
  };
  public_verifier: string;
  signer_key_id: string;
  bytecode_digest: `0x${string}`;
  kit_digest: `0x${string}`;
  registry_manifest_template: Record<string, string>;
  verify_command: string;
  register_command: string;
  rollback: string;
  operator_deploys_with: "local_solana_toolchain";
  solana_release_status?: "approved" | "candidate_digest_required";
  reviewed_solana_v2_artifact?: {
    artifact_id: string;
    program_data_digest: `0x${string}`;
    elf_sha256: `0x${string}`;
    provenance_ref: string;
    status: "approved";
    operator_must_match_digest_before_verify: true;
    deploy_button: false;
  };
}

export type KitCliResult =
  | {
      ok: true;
      command: string;
      envelope?: TestnetGateKitEnvelope;
      report?: TestnetReadinessReport;
      public?: unknown;
      file_kind?: KitFileKind;
      handoff?: OperatorHandoff;
      broadcast?: false;
    }
  | { ok: false; command: string; reason: string; file_kind?: KitFileKind; handoff?: OperatorHandoff };
