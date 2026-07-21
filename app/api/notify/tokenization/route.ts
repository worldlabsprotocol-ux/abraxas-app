// FILE: app/api/notify/tokenization/route.ts
// Tokenization request — on-chain authentication proof (primary). Legacy email optional.

import { NextRequest, NextResponse } from "next/server";
import { issueAuthenticationProof } from "@/lib/authenticationProof/issue";
import { maybeLegacyAdminEmail } from "@/lib/notify/legacyEmail";
import { adminEmailShell, adminEmailTable } from "@/lib/notify/adminResend";

interface NotifyBody {
  business_name: string;
  tier: string;
  amount_usdc: number;
  contact_email?: string | null;
  contact_x?: string | null;
  sending_wallet?: string | null;
  request_id?: string | null;
  source?: "supabase" | "local";
}

export async function POST(req: NextRequest) {
  const body: NotifyBody = await req.json().catch(() => ({
    business_name: "Unknown",
    tier: "unknown",
    amount_usdc: 0,
  }));

  const recordId = body.request_id ?? `tokenize-${Date.now()}`;

  const proof = await issueAuthenticationProof({
    eventType: "tokenization_request",
    recordId,
    recordPayload: {
      business_name: body.business_name,
      tier: body.tier,
      amount_usdc: body.amount_usdc,
      contact_email: body.contact_email,
      wallet: body.sending_wallet,
      source: body.source,
    },
  });

  const legacy = await maybeLegacyAdminEmail({
    subject: `Tokenization — ${body.business_name} · ${body.tier?.toUpperCase()}`,
    html: adminEmailShell(
      "Legacy tokenization notify",
      adminEmailTable({ "Proof ID": proof.proof_id, Business: body.business_name, Tier: body.tier }),
    ),
  });

  return NextResponse.json({ ok: true, proof, legacy });
}
