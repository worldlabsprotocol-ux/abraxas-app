#!/usr/bin/env npx tsx
/** Build #539 — devnet trust registry observation + Squads custody preflight + activation gate. */
import { mkdirSync, writeFileSync } from "fs";
import { observeDevnetTrustRegistryActivation } from "@/lib/solana/trustRegistry/governance/observeDevnetTrustRegistryActivation";
import { runGovernanceActivationGate } from "@/lib/solana/trustRegistry/governance/governanceActivationGate";
import { fetchInstitutionalSquadsCustody } from "@/lib/solana/trustRegistry/governance/fetchInstitutionalSquadsCustody";

async function main() {
  const rpc = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const observation = await observeDevnetTrustRegistryActivation(rpc);
  const custody = await fetchInstitutionalSquadsCustody({ rpcUrl: rpc });

  const gate = runGovernanceActivationGate({
    devnetObservation: observation,
    squadsMemberPubkeys: custody.env.squadsMemberPubkeysDocumented,
    squadsThreshold: custody.env.squadsThresholdDocumented,
    squadsCustodyPreflight: custody.preflight,
    protocolUpgradeVaultPda: custody.protocolUpgradeMultisig?.derivedVaultPda ?? null,
    registryAdministrationVaultPda: custody.registryAdminMultisig?.derivedVaultPda ?? null,
  });

  const out = "/opt/cursor/artifacts/trust-registry-governance-activation-gate-v539.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(gate, null, 2));
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 2);
}

void main();
