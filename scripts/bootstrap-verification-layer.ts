#!/usr/bin/env npx ts-node
// FILE: scripts/bootstrap-verification-layer.ts
// Ops bootstrap — check env, seed lot inventory, report verification layer gaps.
// Run: DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config scripts/bootstrap-verification-layer.ts

import { createClient } from "@supabase/supabase-js";
import { getVerificationLayerStatus } from "../lib/authenticationProof/verificationLayerStatus";
import { verificationLayerProgress } from "../lib/authenticationProof/verificationLayerProgress";
import { runE2eVerificationCheck } from "../lib/authenticationProof/runE2eVerificationCheck";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const PRODUCTION_LOTS = [
  { asset_id: "ABX-RE-HOSP-001", lot_number: 1, status: "available", notes: "Cielo Sunrise — hospitality RWA reference" },
  { asset_id: "ABX-RE-LAND-006", lot_number: 1, status: "available", notes: "Chickasaw Project — land diligence reference" },
] as const;

async function seedLotInventory(): Promise<number> {
  if (!SB_URL || !SB_KEY) {
    console.log("⊘ Skipping lot inventory seed — Supabase not configured");
    return 0;
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  let seeded = 0;

  for (const lot of PRODUCTION_LOTS) {
    const { error } = await sb.from("asset_lot_inventory").upsert(
      {
        asset_id: lot.asset_id,
        lot_number: lot.lot_number,
        status: lot.status,
        notes: lot.notes,
        source: "bootstrap_verification_layer",
      },
      { onConflict: "asset_id,lot_number" },
    );
    if (error) {
      console.log(`✗ ${lot.asset_id}: ${error.message}`);
    } else {
      console.log(`✓ Seeded lot inventory: ${lot.asset_id}`);
      seeded++;
    }
  }

  return seeded;
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  ABRAXAS VERIFICATION LAYER BOOTSTRAP                ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const seeded = await seedLotInventory();
  if (seeded > 0) console.log(`\nSeeded ${seeded} production reference lot(s).\n`);

  const layer = await getVerificationLayerStatus();
  const progress = verificationLayerProgress(layer);
  const e2e = await runE2eVerificationCheck();

  console.log(`Verification layer: ${progress.done}/${progress.total} live (${progress.percent}%)`);
  console.log(`Summary: ${layer.summary}\n`);

  for (const item of layer.items) {
    const icon = item.status === "live" ? "✓" : item.status === "partial" ? "◐" : "○";
    console.log(`  ${icon} [${item.status}] ${item.label}`);
    if (item.blockers.length && item.status !== "live") {
      for (const b of item.blockers) console.log(`      → ${b}`);
    }
  }

  console.log(`\nE2E: ${e2e.summary}`);
  for (const step of e2e.steps) {
    console.log(`  ${step.passed ? "✓" : "○"} ${step.label}`);
  }

  if (progress.isFullyReady) {
    console.log("\n✓ Verification layer is 7/7 production-ready.\n");
    process.exit(0);
  }

  console.log("\nRemaining blockers:");
  const allBlockers = new Set<string>();
  for (const item of layer.items) {
    if (item.status !== "live") item.blockers.forEach((b) => allBlockers.add(b));
  }
  allBlockers.forEach((b) => console.log(`  → ${b}`));

  if (!process.env.ABRAXAS_SIGNING_KEY) {
    console.log("\nTip: node scripts/generate-abraxas-key.js\n");
  }

  process.exit(progress.isFullyReady ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
