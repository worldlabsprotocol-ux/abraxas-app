// FILE: app/api/auth/wallet/create/route.ts
// Step 2: after email verification, create (or fetch existing) Solana wallet
// for this email. Idempotent — calling twice for the same email returns
// the same public key, never generates a second wallet.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSolanaKeypair } from "@/lib/solanaWallet";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("embedded_wallets")
      .select("public_key")
      .eq("user_email", email)
      .single();

    if (existing) {
      return NextResponse.json({ publicKey: existing.public_key, created: false });
    }

    const { publicKey, encryptedSecret } = generateSolanaKeypair();

    const { error: insertError } = await supabase.from("embedded_wallets").insert({
      user_email: email,
      public_key: publicKey,
      encrypted_iv: encryptedSecret.iv,
      encrypted_tag: encryptedSecret.authTag,
      encrypted_secret: encryptedSecret.ciphertext,
    });

    if (insertError) throw insertError;

    return NextResponse.json({ publicKey, created: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
