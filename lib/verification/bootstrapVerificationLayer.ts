// FILE: lib/verification/bootstrapVerificationLayer.ts
// One-shot production bootstrap — seed lot inventory + report blockers.

import { createClient } from "@supabase/supabase-js";
import { checkAuthenticationProofsTable } from "@/lib/authenticationProof/persistAuthenticationProof";
import { parseEnvBool } from "@/lib/env/parseEnvBool";
import { loadReceiptSigningKey, loadReceiptVerificationKey } from "@/lib/decisionReceipts/signing";
import { runE2eVerificationCheck } from "@/lib/authenticationProof/runE2eVerificationCheck";
import { getVerificationLayerStatus } from "@/lib/authenticationProof/verificationLayerStatus";
import { verificationLayerProgress } from "@/lib/authenticationProof/verificationLayerProgress";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const PRODUCTION_LOTS = [
  { asset_id: "ABX-RE-HOSP-001", lot_number: 1, status: "available", notes: "Cielo Sunrise — hospitality RWA reference" },
  { asset_id: "ABX-RE-LAND-006", lot_number: 1, status: "available", notes: "Chickasaw Project — land diligence reference" },
] as const;

export async function seedLotInventory(): Promise<{ seeded: number; errors: string[] }> {
  if (!SB_URL || !SB_KEY) return { seeded: 0, errors: ["supabase_not_configured"] };

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const errors: string[] = [];
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
    if (error) errors.push(`${lot.asset_id}: ${error.message}`);
    else seeded++;
  }

  return { seeded, errors };
}

export async function getVerificationBootstrapReport() {
  const signingConfigured = Boolean(loadReceiptSigningKey());
  const verificationKeyConfigured = Boolean(loadReceiptVerificationKey());
  const supabaseConfigured = Boolean(SB_URL && SB_KEY);
  const autoApply = parseEnvBool(process.env.ASSET_MONITORING_AUTO_APPLY);
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET);

  const proofsTable = await checkAuthenticationProofsTable();

  let lotInventoryRows = 0;
  if (supabaseConfigured) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { count } = await sb.from("asset_lot_inventory").select("id", { count: "exact", head: true });
    lotInventoryRows = count ?? 0;
  }

  const layer = await getVerificationLayerStatus();
  const progress = verificationLayerProgress(layer);
  const e2e = await runE2eVerificationCheck();

  const blockers: string[] = [];
  if (!signingConfigured) blockers.push("ABRAXAS_SIGNING_KEY missing or invalid JSON");
  if (!verificationKeyConfigured) blockers.push("ABRAXAS_PUBLIC_KEY missing or invalid JSON");
  if (!supabaseConfigured) blockers.push("Supabase URL + service role key missing");
  if (!proofsTable.writable) {
    blockers.push(proofsTable.hint ?? proofsTable.error ?? "authentication_proofs table not writable");
  }
  if (!autoApply) blockers.push("ASSET_MONITORING_AUTO_APPLY must be true (redeploy after setting in Vercel)");
  if (lotInventoryRows === 0) blockers.push("asset_lot_inventory empty — POST /api/verify/bootstrap to seed");
  if (!e2e.steps.find((s) => s.id === "proof-lookup-roundtrip")?.passed) {
    blockers.push("Proof persistence roundtrip failing — fix authentication_proofs table first");
  }

  return {
    env: {
      signing_configured: signingConfigured,
      verification_key_configured: verificationKeyConfigured,
      supabase_configured: supabaseConfigured,
      asset_monitoring_auto_apply: autoApply,
      cron_secret_configured: cronSecretConfigured,
    },
    database: {
      authentication_proofs: proofsTable,
      lot_inventory_rows: lotInventoryRows,
    },
    verification_layer: { ...layer, progress },
    e2e: {
      ok: e2e.ok,
      fully_live: e2e.signing_configured && e2e.verification_key_configured && e2e.supabase_configured && e2e.ok,
      steps: e2e.steps,
      blockers: e2e.blockers,
    },
    blockers,
    ready: progress.isFullyReady && e2e.ok,
    next_steps: blockers.length
      ? blockers
      : ["All verification layer checks passed — 7/7 ready."],
  };
}
