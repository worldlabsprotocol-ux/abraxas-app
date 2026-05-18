// FILE: app/api/verification/initiate/route.ts
// Initiates a verification record for a newly minted asset.
// Called immediately after successful mint transaction.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient }         from "@/lib/supabase";
import {
  buildInitialRecord,
  computeRiskScore,
}                                    from "@/lib/protocol/verificationEngine";
import { ASSET_CLASS_REGISTRY }      from "@/lib/protocol/assetClasses";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.assetId || !body?.assetClass || !body?.ownerWallet) {
    return NextResponse.json({ error:"Missing required fields" }, { status:400 });
  }

  const def = ASSET_CLASS_REGISTRY[body.assetClass as keyof typeof ASSET_CLASS_REGISTRY];
  if (!def) return NextResponse.json({ error:"Unknown asset class" }, { status:400 });

  const record = buildInitialRecord({
    assetId:      body.assetId,
    assetClass:   body.assetClass,
    ownerWallet:  body.ownerWallet,
    jurisdiction: body.jurisdiction ?? "US_STANDARD",
  });

  record.riskScore = computeRiskScore(record);

  const db = createAdminClient();
  if (db) {
    // Persist to Supabase
    await db.from("verification_records").insert({
      asset_id:         record.assetId,
      asset_class:      record.assetClass,
      owner_wallet:     record.ownerWallet,
      current_stage:    record.currentStage,
      total_stages:     record.totalStages,
      status:           record.status,
      stages:           JSON.stringify(record.stages),
      jurisdiction:     record.jurisdiction,
      risk_score:       record.riskScore,
      confidence_score: record.confidenceScore,
      fraud_flags:      record.fraudFlags,
      created_at:       new Date(record.createdAt).toISOString(),
    });

    // Log the initiation event
    await db.from("asset_events").insert({
      asset_id:   body.assetId,
      event_type: "VERIFICATION_INITIATED",
      actor:      "PROTOCOL",
      payload:    {
        stages:       record.totalStages,
        jurisdiction: record.jurisdiction,
        assetClass:   record.assetClass,
      },
    });
  }

  return NextResponse.json({ success:true, record });
}// FILE: app/api/verification/initiate/route.ts
// Initiates a verification record for a newly minted asset.
// Called immediately after successful mint transaction.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient }         from "@/lib/supabase";
import {
  buildInitialRecord,
  computeRiskScore,
}                                    from "@/lib/protocol/verificationEngine";
import { ASSET_CLASS_REGISTRY }      from "@/lib/protocol/assetClasses";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.assetId || !body?.assetClass || !body?.ownerWallet) {
    return NextResponse.json({ error:"Missing required fields" }, { status:400 });
  }

  const def = ASSET_CLASS_REGISTRY[body.assetClass as keyof typeof ASSET_CLASS_REGISTRY];
  if (!def) return NextResponse.json({ error:"Unknown asset class" }, { status:400 });

  const record = buildInitialRecord({
    assetId:      body.assetId,
    assetClass:   body.assetClass,
    ownerWallet:  body.ownerWallet,
    jurisdiction: body.jurisdiction ?? "US_STANDARD",
  });

  record.riskScore = computeRiskScore(record);

  const db = createAdminClient();
  if (db) {
    // Persist to Supabase
    await db.from("verification_records").insert({
      asset_id:         record.assetId,
      asset_class:      record.assetClass,
      owner_wallet:     record.ownerWallet,
      current_stage:    record.currentStage,
      total_stages:     record.totalStages,
      status:           record.status,
      stages:           JSON.stringify(record.stages),
      jurisdiction:     record.jurisdiction,
      risk_score:       record.riskScore,
      confidence_score: record.confidenceScore,
      fraud_flags:      record.fraudFlags,
      created_at:       new Date(record.createdAt).toISOString(),
    });

    // Log the initiation event
    await db.from("asset_events").insert({
      asset_id:   body.assetId,
      event_type: "VERIFICATION_INITIATED",
      actor:      "PROTOCOL",
      payload:    {
        stages:       record.totalStages,
        jurisdiction: record.jurisdiction,
        assetClass:   record.assetClass,
      },
    });
  }

  return NextResponse.json({ success:true, record });
}