import { SOLANA_GATE_V2_RELEASE, SOLANA_GATE_V2_RELEASE_R1 } from "./solanaV2Release";

export const SOLANA_GATE_ARTIFACT_REGISTRY_VERSION = "1.1.0" as const;

export const SOLANA_UPGRADEABLE_LOADER = "BPFLoaderUpgradeab1e11111111111111111111111" as const;
export const SOLANA_GATE_CONFIG_SEED = "gate_config" as const;
export const SOLANA_GATE_ACCOUNT_NAME = "GateConfig" as const;

export type SolanaGateArtifactClass = "v2_institutional" | "v1_standard";
export type SolanaGateArtifactStatus = "approved" | "retired" | "revoked";

export interface SolanaGateArtifact {
  artifact_id: string;
  program_id?: string;
  artifact_class: SolanaGateArtifactClass;
  program_data_digest: `0x${string}`;
  elf_sha256?: `0x${string}`;
  schema_versions_supported: readonly (1 | 2)[];
  canonical_message_lengths: readonly (372 | 468)[];
  institutional_capable: boolean;
  provenance_ref: string;
  status: SolanaGateArtifactStatus;
  live: false;
  fixture?: boolean;
}

/** Test-only ELF fingerprints. Never accepted outside NODE_ENV=test. */
export const SOLANA_GATE_V2_PROGRAM_ELF = new TextEncoder().encode("abraxas-solana-gate-v2-institutional-elf");
export const SOLANA_GATE_V1_PROGRAM_ELF = new TextEncoder().encode("abraxas-solana-gate-v1-standard-elf");

export const SOLANA_GATE_V2_PROGRAM_DIGEST =
  "0x753cfc47c93b603a19553f0556cbcd4a3242546db413fdfde4537ea58b454ca9" as const;
export const SOLANA_GATE_V1_PROGRAM_DIGEST =
  "0xb805e00731fc1aedf7fa27cb4730ab1285b333de4c08c20c7ce653b35cc0c90f" as const;

export const SOLANA_GATE_V2_REVOKED_DIGEST =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;
export const SOLANA_GATE_V2_RETIRED_DIGEST =
  "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" as const;
export const SOLANA_GATE_V2_CAPABILITY_MISMATCH_DIGEST =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

export const SOLANA_GATE_ARTIFACTS: readonly SolanaGateArtifact[] = [
  {
    artifact_id: SOLANA_GATE_V2_RELEASE.artifact_id,
    program_id: SOLANA_GATE_V2_RELEASE.program_id,
    artifact_class: "v2_institutional",
    program_data_digest: SOLANA_GATE_V2_RELEASE.program_data_digest,
    elf_sha256: SOLANA_GATE_V2_RELEASE.elf_sha256,
    schema_versions_supported: SOLANA_GATE_V2_RELEASE.schema_versions_supported,
    canonical_message_lengths: SOLANA_GATE_V2_RELEASE.canonical_message_lengths,
    institutional_capable: true,
    provenance_ref: SOLANA_GATE_V2_RELEASE.provenance_ref,
    status: "approved",
    live: false,
  },
  {
    artifact_id: SOLANA_GATE_V2_RELEASE_R1.artifact_id,
    program_id: SOLANA_GATE_V2_RELEASE_R1.program_id,
    artifact_class: "v2_institutional",
    program_data_digest: SOLANA_GATE_V2_RELEASE_R1.program_data_digest,
    elf_sha256: SOLANA_GATE_V2_RELEASE_R1.elf_sha256,
    schema_versions_supported: SOLANA_GATE_V2_RELEASE_R1.schema_versions_supported,
    canonical_message_lengths: SOLANA_GATE_V2_RELEASE_R1.canonical_message_lengths,
    institutional_capable: true,
    provenance_ref: SOLANA_GATE_V2_RELEASE_R1.provenance_ref,
    status: "approved",
    live: false,
  },
  {
    artifact_id: "abraxas_eligibility_gate_v2_institutional",
    artifact_class: "v2_institutional",
    program_data_digest: SOLANA_GATE_V2_PROGRAM_DIGEST,
    schema_versions_supported: [2],
    canonical_message_lengths: [468],
    institutional_capable: true,
    provenance_ref: "test-fixture:solana-gate-v2-elf",
    status: "approved",
    live: false,
    fixture: true,
  },
  {
    artifact_id: "abraxas_eligibility_gate_v1_standard",
    artifact_class: "v1_standard",
    program_data_digest: SOLANA_GATE_V1_PROGRAM_DIGEST,
    schema_versions_supported: [1],
    canonical_message_lengths: [372],
    institutional_capable: false,
    provenance_ref: "test-fixture:solana-gate-v1-elf",
    status: "approved",
    live: false,
    fixture: true,
  },
  {
    artifact_id: "abraxas_eligibility_gate_v2_revoked_control",
    artifact_class: "v2_institutional",
    program_data_digest: SOLANA_GATE_V2_REVOKED_DIGEST,
    schema_versions_supported: [2],
    canonical_message_lengths: [468],
    institutional_capable: true,
    provenance_ref: "control:revoked",
    status: "revoked",
    live: false,
    fixture: true,
  },
  {
    artifact_id: "abraxas_eligibility_gate_v2_retired_control",
    artifact_class: "v2_institutional",
    program_data_digest: SOLANA_GATE_V2_RETIRED_DIGEST,
    schema_versions_supported: [2],
    canonical_message_lengths: [468],
    institutional_capable: true,
    provenance_ref: "control:retired",
    status: "retired",
    live: false,
    fixture: true,
  },
  {
    artifact_id: "abraxas_eligibility_gate_v2_capability_mismatch_control",
    artifact_class: "v2_institutional",
    program_data_digest: SOLANA_GATE_V2_CAPABILITY_MISMATCH_DIGEST,
    schema_versions_supported: [2],
    canonical_message_lengths: [468],
    institutional_capable: false,
    provenance_ref: "control:capability-mismatch",
    status: "approved",
    live: false,
    fixture: true,
  },
];

export function solanaFixtureArtifactsAllowed(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NODE_ENV === "test";
}

export function artifactCapabilityConsistent(row: SolanaGateArtifact): boolean {
  if (row.artifact_class === "v2_institutional") {
    return row.institutional_capable
      && row.schema_versions_supported.includes(2)
      && row.canonical_message_lengths.includes(468);
  }
  if (row.artifact_class === "v1_standard") {
    return !row.institutional_capable
      && row.schema_versions_supported.includes(1)
      && row.canonical_message_lengths.includes(372);
  }
  return false;
}

export function lookupSolanaGateArtifact(programDataDigest: string): SolanaGateArtifact | null {
  const digest = programDataDigest.toLowerCase();
  const row = SOLANA_GATE_ARTIFACTS.find((item) => item.program_data_digest.toLowerCase() === digest) ?? null;
  if (!row) return null;
  if (row.fixture && !solanaFixtureArtifactsAllowed()) return null;
  if (row.status !== "approved") return null;
  if (!artifactCapabilityConsistent(row)) return null;
  return row;
}
