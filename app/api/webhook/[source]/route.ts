// FILE: app/api/webhook/[source]/route.ts
// Custodian webhook receiver — Baxus, Courtyard, Metropolis, LBMA.
// When a custodian confirms physical custody → auto-advances asset to verified.
// Protected by WEBHOOK_SECRET per source.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processEvent } from "@/lib/assetStateMachine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SECRETS: Record<string, string> = {
  baxus:       process.env.WEBHOOK_SECRET_BAXUS     ?? "",
  courtyard:   process.env.WEBHOOK_SECRET_COURTYARD ?? "",
  metropolis:  process.env.WEBHOOK_SECRET_METROPOLIS ?? "",
  lbma:        process.env.WEBHOOK_SECRET_LBMA      ?? "",
};

export async function POST(req: NextRequest, { params }: { params: { source: string } }) {
  const { source } = params;
  const expectedSecret = SECRETS[source];
  const incomingSecret = req.headers.get("x-webhook-secret");

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { asset_id, event_type, metadata } = body;

    // Log the webhook
    await supabase.from("webhook_log").insert({
      source, asset_id, event_type, raw_payload: body, processed: false,
    });

    if (!asset_id) return NextResponse.json({ error: "asset_id required" }, { status: 400 });

    // Map custodian event → Abraxas event
    if (["custody_confirmed","verification_passed","asset_authenticated"].includes(event_type)) {
      const { data: asset } = await supabase
        .from("assets").select("owner_wallet").eq("id", asset_id).single();
      if (asset) {
        await processEvent("ASSET_VERIFIED", asset_id, asset.owner_wallet, metadata);
        // Mark webhook as processed
        await supabase.from("webhook_log").update({ processed: true })
          .eq("asset_id", asset_id).eq("source", source).eq("processed", false);
      }
    }

    return NextResponse.json({ received: true, source, asset_id });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}