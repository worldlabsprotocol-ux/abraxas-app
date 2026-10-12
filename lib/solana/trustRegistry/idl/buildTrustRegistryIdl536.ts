import { buildTrustRegistryIdl535 } from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl";
import { anchorGlobalDiscriminator, discriminatorHex } from "@/lib/solana/trustRegistry/idl/anchorDiscriminator";

const GOVERNANCE_INSTRUCTIONS = [
  "extend_registry_governance_layout",
  "nominate_governance_authority",
  "accept_governance_authority",
  "cancel_governance_nomination",
  "expire_governance_nomination",
] as const;

const GOVERNANCE_ERRORS = [
  { code: 6009, name: "RegistryLayoutNotExtended", msg: "registry_layout_not_extended" },
  { code: 6010, name: "RegistryLayoutInvalid", msg: "registry_layout_invalid" },
  { code: 6011, name: "PendingGovernanceTransferActive", msg: "pending_governance_transfer_active" },
  { code: 6012, name: "GovernanceTransferStale", msg: "governance_transfer_stale" },
  { code: 6013, name: "UnauthorizedGovernanceTransfer", msg: "unauthorized_governance_transfer" },
  { code: 6014, name: "NominationExpired", msg: "nomination_expired" },
  { code: 6015, name: "NominationNotExpired", msg: "nomination_not_expired" },
] as const;

/** Build #536 — v535 surface + governance migration instructions (pre-deploy on devnet). */
export function buildTrustRegistryIdl536() {
  const base = buildTrustRegistryIdl535();
  return {
    ...base,
    metadata: {
      ...base.metadata,
      description: "Governed trust registry with governance migration (Build #536).",
    },
    instructions: [
      ...base.instructions,
      ...GOVERNANCE_INSTRUCTIONS.map((name) => ({
        name,
        discriminator: Array.from(anchorGlobalDiscriminator(name)),
        accounts: [],
        args: [],
      })),
    ],
    errors: [...base.errors, ...GOVERNANCE_ERRORS],
  };
}

export function trustRegistryIdlDiscriminatorManifest536() {
  const base535 = buildTrustRegistryIdl535();
  const manifest535 = {
    instructions: Object.fromEntries(
      base535.instructions.map((ix) => [ix.name, discriminatorHex(new Uint8Array(ix.discriminator))]),
    ),
    accounts: Object.fromEntries(
      base535.accounts.map((a) => [a.name, discriminatorHex(new Uint8Array(a.discriminator))]),
    ),
  };
  for (const name of GOVERNANCE_INSTRUCTIONS) {
    manifest535.instructions[name] = discriminatorHex(anchorGlobalDiscriminator(name));
  }
  return manifest535;
}

export const TRUST_REGISTRY_LEGACY_ACCOUNT_DATA_LEN = 8 + 463;
export const TRUST_REGISTRY_EXTENDED_ACCOUNT_DATA_LEN = 8 + 519;
