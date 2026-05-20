// FILE: app/api/auth/link-wallet/route.ts
// Links a Solana wallet address to the authenticated user account.
// The user must be signed in (session) and must sign a challenge message
// with their wallet to prove ownership before the address is stored.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { createAdminClient }         from "@/lib/supabase";
import { PublicKey }                 from "@solana/web3.js";
import { verifyMessageSignature }    from "@/lib/solana/verify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error:"Not authenticated" }, { status:401 });
  }

  const { walletAddress, signature, message } = await req.json();

  // Validate wallet address format
  try { new PublicKey(walletAddress); }
  catch { return NextResponse.json({ error:"Invalid wallet address" }, { status:400 }); }

  // Verify the wallet actually signed the challenge message
  const isValid = await verifyMessageSignature({ walletAddress, signature, message });
  if (!isValid) {
    return NextResponse.json({ error:"Invalid wallet signature" }, { status:403 });
  }

  // Persist wallet link
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error:"DB not configured" }, { status:503 });

  const userId = (session.user as Record<string,unknown>).id as string;

  const { error } = await db
    .from("users")
    .update({ wallet_address: walletAddress })
    .eq("id", userId);

  if (error) return NextResponse.json({ error:error.message }, { status:500 });

  // Log the link event to audit_logs
  await db.from("audit_logs").insert({
    actor:       userId,
    action:      "WALLET_LINKED",
    resource:    "users",
    resource_id: userId,
    new_state:   { wallet_address: walletAddress },
  });

  return NextResponse.json({ success:true, walletAddress });
}