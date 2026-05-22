// FILE: scripts/seed.ts
// Demo data seed. Run: DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config scripts/seed.ts
import { createClient } from "@supabase/supabase-js";
import { randomBytes }  from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEMO_WALLET = "DEMO_WALLET_001";
const PARTNER_ID  = "DEMO_PARTNER_001";

function hexHash(p: string) { return p + randomBytes(16).toString("hex"); }
function daysAgo(n: number) { return new Date(Date.now() - n * 86_400_000).toISOString(); }

async function seed() {
  console.log("Seeding Abraxas demo data...\n");

  // 1. Auth partner
  await (supabase.from("authentication_partners") as any).upsert({
    id: PARTNER_ID, name: "Abraxas Verification Network",
    partner_type: "PROTOCOL_INTERNAL", jurisdictions: ["US_STANDARD"],
    asset_classes: ["Luxury Watch","Fine Metals","Mineral Rights"],
    credentials: ["AAS-1 Certified"], active: true,
  }, { onConflict: "id" });
  console.log("✓ Auth partner");

  // 2. Assets
  const assets = [
    {
      title: "Rolex Submariner Reference 5513 (1968)",
      description: "Original Submariner. Full documentation. Collector grade.",
      category: "Luxury Watch", owner_wallet: DEMO_WALLET,
      declared_value_usd: 28500, verification_status: "approved",
      mint_cost_abra: 150, ltv: 65, collateral_score: 84, fraud_risk_score: 5,
      submitted_at: daysAgo(18), verified_at: daysAgo(8),
    },
    {
      title: "LBMA Gold Bullion — 1oz × 50 Units",
      description: "50 × 1oz LBMA bars. Serial numbers documented. Brinks custody.",
      category: "Fine Metals", owner_wallet: DEMO_WALLET,
      declared_value_usd: 97500, verification_status: "collateral_eligible",
      mint_cost_abra: 200, ltv: 78, collateral_score: 91, fraud_risk_score: 3,
      submitted_at: daysAgo(25), verified_at: daysAgo(12),
      collateralized_at: daysAgo(10),
    },
    {
      title: "Non-Operated Working Interest — Permian Basin",
      description: "Non-op WI 12.5%. Proved developed reserves. Active production.",
      category: "Mineral Rights", owner_wallet: DEMO_WALLET,
      declared_value_usd: 185000, verification_status: "under_review",
      mint_cost_abra: 500, ltv: 55, collateral_score: null, fraud_risk_score: 0,
      submitted_at: daysAgo(4), verified_at: null,
    },
  ];

  const assetIds: string[] = [];
  for (const asset of assets) {
    const { data, error } = await (supabase.from("assets") as any)
      .upsert(asset, { onConflict: "title" }).select("id").single();
    if (error) { console.error("✗ Asset:", error.message); continue; }
    assetIds.push(data.id);
    console.log("✓ Asset:", asset.title.slice(0, 45));
  }

  // 3. Custody records
  if (assetIds[0]) {
    await (supabase.from("custody_records") as any).upsert({
      asset_id: assetIds[0], custodian_id: PARTNER_ID,
      custodian_name: "Certified Horological Vault", custodian_type: "bonded_vault",
      facility_location: "Geneva, Switzerland", received_at: daysAgo(16),
      last_audit_at: daysAgo(5), insurance_value_usd: 35000,
      insurance_provider: "Lloyd's of London", vault_ref: "CHV-2026-ROLEX-5513",
      item_condition: "excellent", status: "active",
      next_audit_due: new Date(Date.now() + 85 * 86_400_000).toISOString(),
    }, { onConflict: "vault_ref" });
    console.log("✓ Custody: Rolex");
  }

  if (assetIds[1]) {
    await (supabase.from("custody_records") as any).upsert({
      asset_id: assetIds[1], custodian_id: PARTNER_ID,
      custodian_name: "Brinks Bonded Vault", custodian_type: "bonded_vault",
      facility_location: "Zürich, Switzerland", received_at: daysAgo(23),
      last_audit_at: daysAgo(7), insurance_value_usd: 110000,
      insurance_provider: "Swiss Re", vault_ref: "BBV-2026-GOLD-50OZ",
      item_condition: "excellent", status: "active",
      next_audit_due: new Date(Date.now() + 83 * 86_400_000).toISOString(),
    }, { onConflict: "vault_ref" });
    console.log("✓ Custody: Gold");
  }

  // 4. Verification certificates
  for (let i = 0; i <= 1; i++) {
    const aid = assetIds[i];
    if (!aid) continue;
    const certId = `AAS1-DEMO-${assets[i].category.replace(/\s/g,"-").toUpperCase()}-${String(i+1).padStart(3,"0")}`;
    await (supabase.from("verification_certificates") as any).upsert({
      certificate_id: certId, asset_id: aid,
      metadata_uri: `ipfs://QmDEMO${randomBytes(8).toString("hex")}`,
      verifier_id: PARTNER_ID, verifier_name: "Abraxas Verification Network",
      verifier_signature: `sig-${randomBytes(16).toString("hex")}`,
      provenance_root: hexHash("merkle-"),
      custody_ref: i === 0 ? "CHV-2026-ROLEX-5513" : "BBV-2026-GOLD-50OZ",
      collateral_score: assets[i].collateral_score ?? 0,
      fraud_risk_score: assets[i].fraud_risk_score,
      liquidity_rating: i === 0 ? "medium" : "high",
      anchored_tx: `DEMO-TX-${randomBytes(20).toString("hex")}`,
      issued_at: assets[i].verified_at,
      valid_until: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    }, { onConflict: "certificate_id" });
    console.log("✓ Certificate:", certId);
  }

  // 5. Energy / mineral rights
  if (assetIds[2]) {
    await (supabase.from("energy_mineral_assets") as any).upsert({
      asset_id: assetIds[2], interest_type: "non_op_working_interest",
      net_acres: 320.5, gross_acres: 2560.0,
      working_interest_pct: 0.125, net_revenue_interest_pct: 0.09375,
      reserve_category: "P50", current_monthly_production: 420,
      twelve_month_avg_production: 405, production_decline_rate_pct: 8.2,
      projected_irr: 18.4, idc_eligible: true, depletion_eligible: true,
      title_status: "pending_clearance", recording_state: "TX",
      operator_track_record_score: 78, operator_years_active: 14,
      historical_revenue: JSON.stringify([
        { month:"2025-11", revenue_usd:14200, boe_produced:420, price_per_boe:33.8 },
        { month:"2025-12", revenue_usd:13800, boe_produced:407, price_per_boe:33.9 },
        { month:"2026-01", revenue_usd:14500, boe_produced:425, price_per_boe:34.1 },
        { month:"2026-02", revenue_usd:14100, boe_produced:415, price_per_boe:34.0 },
        { month:"2026-03", revenue_usd:13950, boe_produced:410, price_per_boe:34.0 },
      ]),
    }, { onConflict: "asset_id" });
    console.log("✓ Energy: Non-Op WI");
  }

  // 6. Asset events — typed, no nulls, clean loop
  type AssetEvent = {
    asset_id: string;
    event_type: string;
    actor: string;
    actor_name: string;
    payload: Record<string, unknown>;
  };

  for (let i = 0; i < Math.min(assetIds.length, 3); i++) {
    const evId = assetIds[i];
    if (!evId) continue;

    const evts: AssetEvent[] = [
      { asset_id: evId, event_type: "asset_created",               actor: "SYSTEM",   actor_name: "Protocol",             payload: { source: "seed" } },
      { asset_id: evId, event_type: "verification_status_changed", actor: PARTNER_ID, actor_name: "Verification Network", payload: { to: "under_review" } },
    ];

    if (i < 2) {
      const score = (assets[i] as Record<string, unknown>).collateral_score ?? 0;
      evts.push(
        { asset_id: evId, event_type: "RISK_SCORED",           actor: "SYSTEM",   actor_name: "Risk Engine",          payload: { score, tier: "A" } },
        { asset_id: evId, event_type: "VERIFICATION_APPROVED", actor: PARTNER_ID, actor_name: "Verification Network", payload: { stage: "completed" } }
      );
    }

    await (supabase.from("asset_events") as any).insert(evts);
    console.log("✓ Events for asset", i + 1);
  }

  console.log("\n✅ Seed complete.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});