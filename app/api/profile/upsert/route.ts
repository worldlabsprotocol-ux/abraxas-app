// FILE: app/api/profile/upsert/route.ts
// Create or update a user profile linked to a wallet address.
// Called automatically when wallet connects for the first time.
import { NextRequest, NextResponse } from "next/server";
import { createClient }             from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProfilePayload {
  wallet_address: string;
  username?:      string;
  display_name?:  string;
  email?:         string;
  bio?:           string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ProfilePayload;

    if (!body.wallet_address) {
      return NextResponse.json({ error: "wallet_address required" }, { status: 400 });
    }

    // Upsert — create on first connect, update on subsequent edits
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          wallet_address: body.wallet_address,
          ...(body.username     && { username:     body.username }),
          ...(body.display_name && { display_name: body.display_name }),
          ...(body.email        && { email:         body.email }),
          ...(body.bio          && { bio:           body.bio }),
        },
        { onConflict: "wallet_address" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet param required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = no rows
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data ?? null });
}
