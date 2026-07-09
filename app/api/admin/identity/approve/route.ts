// FILE: app/api/admin/identity/approve/route.ts
// Approve or reject manual identity document uploads and issue L2 credential.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { checkAdmin } from "@/lib/adminAuth";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as {
    document_id?: string;
    action?: "approve" | "reject";
    jurisdiction?: string;
    document_type?: string;
    reviewer?: string;
    note?: string;
  };

  if (!body.document_id || !body.action) {
    return NextResponse.json({ error: "document_id and action required" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: doc, error: fetchErr } = await sb
    .from("passport_documents")
    .select("*")
    .eq("id", body.document_id)
    .eq("stamp_id", "identity")
    .maybeSingle();

  if (fetchErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const reviewer = body.reviewer ?? "admin";

  if (body.action === "reject") {
    await sb.from("passport_documents").update({
      status: "rejected",
      reviewer_note: body.note ?? null,
      reviewed_at: now,
      reviewed_by: reviewer,
      updated_at: now,
    }).eq("id", doc.id);

    return NextResponse.json({ ok: true, action: "rejected", document_id: doc.id });
  }

  let sui = doc.sui_address;
  if (!sui && doc.user_email) {
    const { data: zk } = await sb
      .from("sui_zklogin_identities")
      .select("sui_address")
      .eq("email", doc.user_email)
      .maybeSingle();
    sui = zk?.sui_address ?? null;
  }

  if (!sui) {
    return NextResponse.json({
      error: "No Sui address linked — user must sign in before approval",
    }, { status: 400 });
  }

  const normalized = normalizeSuiAddress(sui);
  const reviewId = doc.id as string;

  const issued = await issueManualIdentityCredential(normalized, {
    reviewId,
    jurisdiction: body.jurisdiction ?? "US",
    documentType: body.document_type ?? "passport",
    reviewer,
  });

  if (!issued.ok) {
    return NextResponse.json({ error: issued.message ?? "Issuance failed" }, { status: 500 });
  }

  await sb.from("passport_documents").update({
    status: "accepted",
    sui_address: normalized,
    reviewer_note: body.note ?? null,
    reviewed_at: now,
    reviewed_by: reviewer,
    updated_at: now,
  }).eq("id", doc.id);

  return NextResponse.json({
    ok: true,
    action: "approved",
    document_id: doc.id,
    sui_address: normalized,
    jti: issued.jti,
    already_issued: issued.alreadyIssued ?? false,
  });
}
