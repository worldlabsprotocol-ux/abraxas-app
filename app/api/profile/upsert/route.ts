// FILE: app/api/profile/upsert/route.ts
// Create or update a user profile linked to a Sui address (zkLogin primary identity).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface ProfilePayload {
  wallet_address?: string;
  sui_address?: string;
  username?: string;
  display_name?: string;
  email?: string;
  bio?: string;
  avatar_color?: string;
}

function resolveAddress(body: ProfilePayload, searchParam: string | null): string | null {
  return body.sui_address ?? body.wallet_address ?? searchParam ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Profile storage not configured" }, { status: 503 });
    }

    const body = await req.json() as ProfilePayload;
    const address = resolveAddress(body, null);

    if (!address) {
      return NextResponse.json({ error: "sui_address or wallet_address required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          wallet_address: address,
          ...(body.username && { username: body.username }),
          ...(body.display_name && { display_name: body.display_name }),
          ...(body.email && { email: body.email }),
          ...(body.bio && { bio: body.bio }),
          ...(body.avatar_color && { avatar_color: body.avatar_color }),
        },
        { onConflict: "wallet_address" },
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
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ profile: null });
  }

  const address =
    req.nextUrl.searchParams.get("sui") ??
    req.nextUrl.searchParams.get("wallet");

  if (!address) {
    return NextResponse.json({ error: "sui or wallet param required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("wallet_address", address)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data ?? null });
}
