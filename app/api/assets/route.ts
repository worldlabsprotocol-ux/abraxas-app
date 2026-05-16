// FILE: app/api/assets/route.ts
// Asset CRUD — POST to create, GET to list by wallet.
// Falls back gracefully if Supabase not configured.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient }         from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({error:"wallet required"},{status:400});

  const db = createAdminClient();
  if (!db) return NextResponse.json({assets:[],source:"store"});

  const { data, error } = await db
    .from("assets")
    .select("*")
    .eq("owner_wallet", wallet)
    .order("created_at", {ascending:false});

  if (error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({assets: data ?? [], source:"supabase"});
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>null);
  if (!body) return NextResponse.json({error:"invalid body"},{status:400});

  const db = createAdminClient();
  if (!db) {
    // Supabase not configured — return a local-only acknowledgment
    return NextResponse.json({
      success: true, source:"local",
      message: "Supabase not configured. Asset stored in client state only.",
    });
  }

  const { data, error } = await db.from("assets").insert({
    name:           body.name,
    description:    body.description ?? "",
    asset_class:    body.assetClass,
    estimated_usd:  body.estimatedUsd ?? 0,
    ltv:            body.ltv ?? 55,
    custody_partner:body.custodyPartner ?? "",
    mint_cost_abra: body.mintCostAbra,
    tx_signature:   body.txSignature ?? "",
    tx_deduction:   body.txDeduction ?? "",
    token_id:       body.tokenId ?? "",
    owner_wallet:   body.ownerWallet,
    status:         "created",
    image_url:      body.imagePreview ?? "",
    grade:          body.grade ?? null,
    year:           body.year ?? null,
  }).select().single();

  if (error) return NextResponse.json({error:error.message},{status:500});

  // Log the creation event
  await db.from("asset_events").insert({
    asset_id:   data.id,
    event_type: "SUBMITTED",
    actor:      "PROTOCOL",
    payload:    { tx: body.txSignature, abra: body.mintCostAbra },
  });

  return NextResponse.json({success:true, asset:data, source:"supabase"});
}