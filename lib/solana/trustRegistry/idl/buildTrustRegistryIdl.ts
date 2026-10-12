import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { anchorAccountDiscriminator, anchorGlobalDiscriminator, discriminatorHex } from "@/lib/solana/trustRegistry/idl/anchorDiscriminator";

const INSTRUCTIONS = [
  "initialize_registry",
  "register_policy",
  "set_policy_active",
  "add_issuer",
  "suspend_issuer",
  "revoke_issuer",
  "add_revoker",
  "revoke_revoker",
  "add_commitment_publisher",
  "publish_commitment",
  "revoke_commitment",
  "supersede_commitment",
] as const;

const ACCOUNTS = ["TrustRegistry", "PolicyRecord", "CommitmentState"] as const;

/** Canonical IDL (Anchor 0.30 JSON spec) derived from the governed registry program surface. */
export function buildTrustRegistryIdl535() {
  return {
    address: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    metadata: {
      name: "abraxas_trust_registry",
      version: "0.1.0",
      spec: "0.1.0",
      description: "Governed trust registry (Build #533/#534). Generated for release integrity #535.",
    },
    instructions: INSTRUCTIONS.map((name) => ({
      name,
      discriminator: Array.from(anchorGlobalDiscriminator(name)),
      accounts: [],
      args: [],
    })),
    accounts: ACCOUNTS.map((name) => ({
      name,
      discriminator: Array.from(anchorAccountDiscriminator(name)),
    })),
    types: [],
    errors: [
      { code: 6000, name: "InvalidConfig", msg: "invalid_config" },
      { code: 6001, name: "PolicyInactive", msg: "policy_inactive" },
      { code: 6002, name: "PolicyMismatch", msg: "policy_mismatch" },
      { code: 6003, name: "UnauthorizedAuthority", msg: "unauthorized_authority" },
      { code: 6004, name: "UnknownAuthority", msg: "unknown_authority" },
      { code: 6005, name: "DuplicateAuthority", msg: "duplicate_authority" },
      { code: 6006, name: "AuthorityTableFull", msg: "authority_table_full" },
      { code: 6007, name: "StaleSequence", msg: "stale_sequence" },
      { code: 6008, name: "Replayed", msg: "replayed" },
    ],
  };
}

export function trustRegistryIdlDiscriminatorManifest535() {
  return {
    instructions: Object.fromEntries(
      INSTRUCTIONS.map((n) => [n, discriminatorHex(anchorGlobalDiscriminator(n))]),
    ),
    accounts: Object.fromEntries(
      ACCOUNTS.map((n) => [n, discriminatorHex(anchorAccountDiscriminator(n))]),
    ),
  };
}
