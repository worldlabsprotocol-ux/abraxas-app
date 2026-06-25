// FILE: app/api/reclaim/start/route.ts
// Starts a Reclaim Protocol verification. Real SDK usage, verified
// against the actual docs at docs.reclaimprotocol.org/js-sdk/usage,
// not guessed. Needs RECLAIMPROTOCOL_APP_ID and
// RECLAIMPROTOCOL_APP_SECRET set in Vercel, get these from
// https://docs.reclaimprotocol.org/api-key
//
// PROVIDER_IDS below are real, from dev.reclaimprotocol.org/explore.
import { NextRequest, NextResponse } from "next/server";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PROVIDER_IDS: Record<string, string> = {
  github: "b893ae05-e962-4e18-9971-8483509f1839",
  gmail: "cdda4cb6-7b0e-4ad3-814c-6ddeef708adf",
  linkedin: "b814aa5a-077d-4fa0-82df-eca2f86f687b",
  twitter: "ac861de3-e940-48c0-b880-99df2e3969b7",
};

export async function POST(req: NextRequest) {
  try {
    const { provider, userId } = await req.json() as { provider?: string; userId?: string };
    const providerId = provider ? PROVIDER_IDS[provider] : null;
    if (!providerId || providerId.startsWith("REPLACE_WITH")) {
      return NextResponse.json(
        { error: `No real provider ID configured for "${provider}" yet, pick one from dev.reclaimprotocol.org/explore` },
        { status: 400 }
      );
    }

    const reclaimProofRequest = await ReclaimProofRequest.init(
      process.env.RECLAIMPROTOCOL_APP_ID!,
      process.env.RECLAIMPROTOCOL_APP_SECRET!,
      providerId
    );

    await reclaimProofRequest.setAppCallbackUrl(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/reclaim/callback`,
      true
    );

    const contextAddress = userId ?? `anon-${Date.now()}`;
    await reclaimProofRequest.setContext(contextAddress, provider ?? "");

    // Store the provider version now, the callback needs this exact
    // pairing to call verifyProof() correctly, that's a required
    // second argument in the real SDK, not optional.
    const { providerId: storedProviderId, providerVersion } = await reclaimProofRequest.getProviderVersion();
    await supabase.from("reclaim_sessions").insert({
      user_context: contextAddress,
      provider_id: storedProviderId,
      provider_version: providerVersion,
    });

    const configJson = await reclaimProofRequest.toJsonString();
    return NextResponse.json({ configJson, contextAddress });
  } catch (err) {
    return NextResponse.json({ error: "Could not start verification" }, { status: 500 });
  }
}
