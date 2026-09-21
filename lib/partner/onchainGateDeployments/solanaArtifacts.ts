import { keccak256, stringToBytes } from "viem";

export const SOLANA_GATE_ARTIFACT_REGISTRY_VERSION = "1.0.0" as const;

export const SOLANA_UPGRADEABLE_LOADER = "BPFLoaderUpgradeabld11111111111111111111111" as const;
export const SOLANA_GATE_CONFIG_SEED = "gate_config" as const;
export const SOLANA_GATE_ACCOUNT_NAME = "GateConfig" as const;

export type SolanaGateArtifactClass = "v2_institutional" | "v1_standard";

export interface SolanaGateArtifact {
  artifact_id: string;
  artifact_class: SolanaGateArtifactClass;
  program_data_digest: `0x${string}`;
  schema_version: 1 | 2;
  canonical_message_len: 372 | 468;
  institutional_capable: boolean;
  live: false;
}

/** Source-controlled fingerprints. Not client-supplied. Test ELF bytes hash to these ids. */
export const SOLANA_GATE_V2_PROGRAM_ELF = stringToBytes("abraxas-solana-gate-v2-institutional-elf");
export const SOLANA_GATE_V1_PROGRAM_ELF = stringToBytes("abraxas-solana-gate-v1-standard-elf");

export const SOLANA_GATE_V2_PROGRAM_DIGEST = keccak256(SOLANA_GATE_V2_PROGRAM_ELF);
export const SOLANA_GATE_V1_PROGRAM_DIGEST = keccak256(SOLANA_GATE_V1_PROGRAM_ELF);

export const SOLANA_GATE_ARTIFACTS: readonly SolanaGateArtifact[] = [
  {
    artifact_id: "abraxas_eligibility_gate_v2_institutional",
    artifact_class: "v2_institutional",
    program_data_digest: SOLANA_GATE_V2_PROGRAM_DIGEST,
    schema_version: 2,
    canonical_message_len: 468,
    institutional_capable: true,
    live: false,
  },
  {
    artifact_id: "abraxas_eligibility_gate_v1_standard",
    artifact_class: "v1_standard",
    program_data_digest: SOLANA_GATE_V1_PROGRAM_DIGEST,
    schema_version: 1,
    canonical_message_len: 372,
    institutional_capable: false,
    live: false,
  },
];

export function lookupSolanaGateArtifact(programDataDigest: string): SolanaGateArtifact | null {
  const digest = programDataDigest.toLowerCase();
  return SOLANA_GATE_ARTIFACTS.find((row) => row.program_data_digest.toLowerCase() === digest) ?? null;
}
