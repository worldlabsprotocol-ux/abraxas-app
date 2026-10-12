import { SQUADS_MULTISIG_V4_PROGRAM_ID } from "@/lib/solana/trustRegistry/governance/squadsV4Pda";

export type SquadsV4ProvisioningStep = {
  id: string;
  title: string;
  detail: string;
  operatorAction: "founder_wallet" | "record_pda" | "fund_vault" | "configure_env" | "run_preflight" | "await_authorization";
};

/**
 * Operator runbook for founder-controlled Squads v4 provisioning on devnet.
 * Does not generate keys, submit transactions, or invoke Squads create instructions.
 */
export function squadsV4InstitutionalProvisioningRunbook(): {
  schema: "squads_v4_provisioning_runbook_v539";
  squadsProgramId: string;
  minimumPolicy: { members: number; threshold: number; vaultIndex: number };
  envKeys: string[];
  steps: SquadsV4ProvisioningStep[];
  singleFounderAuthorization:
    "After both multisigs pass read-only preflight, the founder explicitly authorizes the first devnet governance activation attempt (nomination/upgrade proposals) in a separate channel.";
} {
  return {
    schema: "squads_v4_provisioning_runbook_v539",
    squadsProgramId: SQUADS_MULTISIG_V4_PROGRAM_ID,
    minimumPolicy: { members: 3, threshold: 2, vaultIndex: 0 },
    envKeys: [
      "ABRAXAS_PROTOCOL_UPGRADE_MULTISIG_PDA",
      "ABRAXAS_REGISTRY_ADMIN_MULTISIG_PDA",
      "ABRAXAS_PROTOCOL_UPGRADE_VAULT_INDEX",
      "ABRAXAS_REGISTRY_ADMIN_VAULT_INDEX",
      "ABRAXAS_VERIFIED_PROTOCOL_UPGRADE_VAULT_PDA",
      "ABRAXAS_VERIFIED_REGISTRY_ADMIN_VAULT_PDA",
      "ABRAXAS_VERIFIED_MULTISIG_DESTINATIONS",
      "ABRAXAS_SQUADS_MEMBER_PUBKEYS",
      "ABRAXAS_SQUADS_THRESHOLD",
      "SOLANA_DEVNET_RPC_URL",
    ],
    steps: [
      {
        id: "signers",
        title: "Provision three independent signers per vault",
        detail:
          "Each institutional signer generates and holds a key outside Cursor (hardware wallet or HSM). No repository keygen. Six unique pubkeys total across two multisigs (disjoint sets preferred).",
        operatorAction: "founder_wallet",
      },
      {
        id: "multisig_protocol",
        title: "Create protocol-upgrade Squads v4 multisig on devnet",
        detail:
          "Using Squads UI or @sqds/multisig transactions.multisigCreate, pick a founder-controlled createKey, set threshold=2, members=3 with Vote+Execute permissions. Record multisig PDA (derived from createKey).",
        operatorAction: "founder_wallet",
      },
      {
        id: "multisig_registry",
        title: "Create registry-administration Squads v4 multisig on devnet",
        detail:
          "Repeat with a different createKey and disjoint member set. Never reuse the protocol-upgrade multisig account.",
        operatorAction: "founder_wallet",
      },
      {
        id: "vault_pdas",
        title: "Verify vault PDAs (index 0 by default)",
        detail:
          "Derive vault PDA with seeds [multisig, multisigPda, vault, index] under SQDS4ep65… Confirm npm run preflight:trust-registry-squads-custody-539 matches on-chain accounts.",
        operatorAction: "record_pda",
      },
      {
        id: "fund",
        title: "Fund both vault PDAs",
        detail: "Send devnet SOL to each vault system account for execution fees (minimum 0.001 SOL recommended).",
        operatorAction: "fund_vault",
      },
      {
        id: "env",
        title: "Configure Abraxas allowlist env",
        detail: "Set multisig PDAs and verified vault PDAs in deployment env. Redeploy or reload server env.",
        operatorAction: "configure_env",
      },
      {
        id: "preflight",
        title: "Run read-only custody preflight",
        detail: "npm run preflight:trust-registry-squads-custody-539 && npm run gate:trust-registry-governance-activation-539",
        operatorAction: "run_preflight",
      },
      {
        id: "authorize",
        title: "Founder authorization for activation",
        detail:
          "Only after preflight passes: founder authorizes first Squads proposals (program upgrade authority transfer + registry governance nomination path).",
        operatorAction: "await_authorization",
      },
    ],
    singleFounderAuthorization:
      "After both multisigs pass read-only preflight, the founder explicitly authorizes the first devnet governance activation attempt (nomination/upgrade proposals) in a separate channel.",
  };
}
