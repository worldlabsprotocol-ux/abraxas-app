#!/usr/bin/env npx tsx
/** Build #538 — read-only devnet observation + fail-closed institutional activation gate. */
import { mkdirSync, writeFileSync } from "fs";
import { observeDevnetTrustRegistryActivation } from "@/lib/solana/trustRegistry/governance/observeDevnetTrustRegistryActivation";
import { runGovernanceActivationGate } from "@/lib/solana/trustRegistry/governance/governanceActivationGate";

async function main() {
  const rpc = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const observation = await observeDevnetTrustRegistryActivation(rpc);
  const members = (process.env.ABRAXAS_SQUADS_MEMBER_PUBKEYS ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const threshold = process.env.ABRAXAS_SQUADS_THRESHOLD
    ? Number(process.env.ABRAXAS_SQUADS_THRESHOLD)
    : null;

  const gate = runGovernanceActivationGate({
    devnetObservation: observation,
    squadsMemberPubkeys: members,
    squadsThreshold: threshold,
  });

  const out = "/opt/cursor/artifacts/trust-registry-governance-activation-gate-v538.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(gate, null, 2));
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 2);
}

void main();
