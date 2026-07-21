// FILE: app/api/assets/inquire/route.ts
// Asset acquisition inquiry — on-chain authentication proof (primary).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issueAuthenticationProof } from "@/lib/authenticationProof/issue";
import { maybeLegacyAdminEmail } from "@/lib/notify/legacyEmail";
import { adminEmailShell, adminEmailTable } from "@/lib/notify/adminResend";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    asset_id?: string;
    asset_name?: string;
    package_interest?: string;
    email?: string;
    wallet?: string;
    message?: string;
  };

  const email = body.email?.trim();
  const assetId = body.asset_id?.trim();
  const assetName = body.asset_name?.trim();

  if (!email?.includes("@") || !assetId || !assetName) {
    return NextResponse.json({ error: "asset_id, asset_name, and valid email required" }, { status: 400 });
  }

  const record = {
    asset_id: assetId,
    asset_name: assetName,
    package_interest: body.package_interest ?? null,
    email,
    wallet: body.wallet ?? null,
    message: body.message?.trim() ?? null,
    status: "submitted",
  };

  let recordId = `local-${Date.now()}`;

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.from("asset_inquiries").insert(record).select("id").single();
    if (error) {
      console.error("asset_inquiries insert:", error.message);
      return NextResponse.json({ error: "Could not save inquiry" }, { status: 500 });
    }
    recordId = data.id as string;
  }

  const proof = await issueAuthenticationProof({
    eventType: "asset_inquiry",
    recordId,
    recordPayload: { ...record, record_id: recordId },
  });

  if (SB_URL && SB_KEY && proof.proof_id) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    await sb.from("asset_inquiries").update({ proof_id: proof.proof_id }).eq("id", recordId);
  }

  void maybeLegacyAdminEmail({
    subject: `Asset inquiry — ${assetName}`,
    html: adminEmailShell("Legacy notify", adminEmailTable({ "Proof ID": proof.proof_id, Asset: assetName })),
  });

  return NextResponse.json({
    ok: true,
    record_id: recordId,
    proof,
    message: "Inquiry authenticated on-protocol — verify proof independently.",
  });
}
