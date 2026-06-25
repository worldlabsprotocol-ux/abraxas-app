// FILE: app/api/reclaim/callback/route.ts
// Receives the proof from Reclaim after the user completes
// verification, verifies it server-side, stores the result. This is
// the endpoint set via setAppCallbackUrl() in the start route, must
// be reachable over the public internet (use ngrok for local testing,
// per Reclaim's own docs).
import { NextRequest, NextResponse } from "next/server";
import { verifyProof } from "@reclaimprotocol/js-sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pulls the context address out of the raw, not-yet-verified proof
// payload so we know which stored session (and therefore which
// provider/version) this callback belongs to. Reclaim's own docs say
// context is "used to identify the request when you receive it back
// in the callback," which only works if it's readable before
// verification, this checks the couple of field shapes that pattern
// implies. If your actual payload nests it differently, log the raw
// body once and adjust the path below to match what you actually see.
function extractContextAddress(raw: unknown): string | null {
  try {
    const proofsArray = Array.isArray(raw) ? raw : [raw];
    const first = proofsArray[0] as Record<string, unknown>;
    const claimData = (first?.claimData ?? first) as Record<string, unknown>;
    const contextRaw = claimData?.context;
    if (typeof contextRaw === "string") {
      const parsed = JSON.parse(contextRaw) as { contextAddress?: string };
      return parsed.contextAddress ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const proofs = await req.json();

    const contextAddress = extractContextAddress(proofs);
    if (!contextAddress) {
      return NextResponse.json({ error: "Could not identify session from proof" }, { status: 400 });
    }

    const { data: session } = await supabase
      .from("reclaim_sessions")
      .select("provider_id, provider_version")
      .eq("user_context", contextAddress)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!session) {
      return NextResponse.json({ error: "No matching verification session found" }, { status: 400 });
    }

    const { isVerified, data, error } = await verifyProof(proofs, {
      providerId: session.provider_id,
      providerVersion: session.provider_version,
    });

    if (!isVerified || !data || data.length === 0) {
      return NextResponse.json({ error: error ?? "Verification failed" }, { status: 400 });
    }

    const { context, extractedParameters } = data[0];

    await supabase.from("reclaim_verifications").insert({
      user_context: context?.address ?? contextAddress,
      provider_label: context?.message ?? null,
      extracted_parameters: extractedParameters,
      verified_at: new Date().toISOString(),
    });

    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: "Could not process verification" }, { status: 500 });
  }
}
