#!/usr/bin/env npx tsx
/** Build #539 — read-only Squads v4 dual-multisig custody preflight (devnet RPC). */
import { mkdirSync, writeFileSync } from "fs";
import { fetchInstitutionalSquadsCustody } from "@/lib/solana/trustRegistry/governance/fetchInstitutionalSquadsCustody";
import { squadsV4InstitutionalProvisioningRunbook } from "@/lib/solana/trustRegistry/governance/squadsV4ProvisioningRunbook";

async function main() {
  const rpc = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const custody = await fetchInstitutionalSquadsCustody({ rpcUrl: rpc });
  const runbook = squadsV4InstitutionalProvisioningRunbook();

  const payload = {
    custody,
    runbook,
    authorization_boundary:
      "No Squads create/fund/propose/execute from this script. Founder authorization required for activation.",
  };

  const out = "/opt/cursor/artifacts/trust-registry-squads-custody-preflight-v539.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(custody.preflight.ok ? 0 : 2);
}

void main();
