import live from "../../../../solana/abraxas-eligibility-gate/release/trust-registry-v535-devnet-live.json";

/** Immutable Build #535 devnet live proof — do not mutate on-chain references without new evidence packet. */
export const TRUST_REGISTRY_DEVNET_LIVE_V535 = live as {
  schema: string;
  network_id: string;
  program_id: string;
  elf_sha256: string;
  upgrade_authority: string;
  governance_authority: string;
  registry_domain_hex: string;
  registry_pda: string;
  policy_commitment_hex: string;
  commitment_state_pda: string;
  program_data_address: string;
  enforcement: {
    revoked_on_chain: boolean;
    post_revoke_verifier_outcome: string;
  };
};

export const TRUST_REGISTRY_DEVNET_UPGRADE_AUTHORITY = TRUST_REGISTRY_DEVNET_LIVE_V535.upgrade_authority;
export const TRUST_REGISTRY_DEVNET_GOVERNANCE_AUTHORITY = TRUST_REGISTRY_DEVNET_LIVE_V535.governance_authority;
