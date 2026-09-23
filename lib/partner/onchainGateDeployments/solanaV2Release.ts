/** Safe, source-controlled V2 release metadata. No keys, RPC, account bytes, or ELF binary. */
export const SOLANA_GATE_V2_RELEASE_R1 = {
  artifact_id: "abraxas_eligibility_gate_v2_institutional_r1",
  program_id: "GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB",
  crate: "abraxas-eligibility-gate",
  package_version: "0.1.0",
  source_commit: "0480d9ac4c739a99a6f3d5773da351a19a1d0f79",
  rust_host: "1.88.0",
  rust_sbf: "1.89.0",
  platform_tools: "v1.53",
  cargo_build_sbf: "2.2.20",
  anchor: "0.30.1",
  solana_program_test: "1.18.26",
  build_command:
    "PATH=\"$HOME/.cache/solana/v1.53/platform-tools/rust/bin:$PATH\" cargo-build-sbf --tools-version v1.53 --no-rustup-override --manifest-path programs/abraxas-eligibility-gate/Cargo.toml",
  program_data_digest: "0x956eb9294aa866e8dbd76960841bdb17d3a58ccf801904038cea1169572f9787" as const,
  elf_sha256: "0x4036d3ada9835db952b1a73f9f8b549f9a6a22ab5174554a9dd582ed249be1aa" as const,
  schema_versions_supported: [2] as const,
  canonical_message_lengths: [468] as const,
  institutional_gate_config: true,
  provenance_ref: "solana/abraxas-eligibility-gate/release/v2-institutional.artifact.json",
  status: "approved" as const,
  live: false as const,
};

/** Rebuilt independently in CI against the operator's pinned devnet program ID. */
export const SOLANA_GATE_V2_RELEASE = {
  ...SOLANA_GATE_V2_RELEASE_R1,
  artifact_id: "abraxas_eligibility_gate_v2_institutional_r2",
  program_id: "4hf3cY57ciPakr4omyTSbksAfW672iGrdo6fiDVQAD4K",
  source_commit: "cebf7b788bebf2609b40a8fbfe94ead8f50aec07",
  program_data_digest: "0x6adcb3850f269710bd815bde0cc518cf6d02e167a01398776d8d78df9f566991" as const,
  elf_sha256: "0x37f7310ee6ceab81619964165a8d570a1af3502bf52bc8bf52e46d6d1515cdd8" as const,
  provenance_ref: "solana/abraxas-eligibility-gate/release/v2-institutional-r2.artifact.json",
};
