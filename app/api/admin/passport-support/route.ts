// FILE: app/api/admin/passport-support/route.ts
// Privacy-sensitive operator queue for Passport holder support requests.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import {
  isPassportSupportStatus,
  parsePassportSupportCategory,
  passportSupportBodyFromMessage,
  passportSupportCategory,
  passportSupportIssueLabel,
  passportSupportReferenceFromMessage,
  passportSupportStatusLabel,
} from "@/lib/passport/passportSupport";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return url && key
    ? createClient(url, key, { auth: { persistSession: false } })
    : null;
}

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = database();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Support queue is unavailable." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("contact_submissions")
    .select("id,email,category,message,created_at")
    .like("category", "passport-support:%")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: "Support queue is unavailable." }, { status: 500 });
  }

  const requests = (data ?? []).flatMap(row => {
    const category = parsePassportSupportCategory(row.category);
    const reference = passportSupportReferenceFromMessage(row.message);
    if (!category || !reference || typeof row.id !== "string") return [];
    return [{
      id: row.id,
      reference,
      email: typeof row.email === "string" ? row.email : "",
      issue_type: category.issue,
      issue_label: passportSupportIssueLabel(category.issue),
      status: category.status,
      status_label: passportSupportStatusLabel(category.status),
      message: passportSupportBodyFromMessage(row.message),
      submitted_at: typeof row.created_at === "string" ? row.created_at : "",
    }];
  });

  return NextResponse.json({ ok: true, requests });
}

export async function PATCH(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; status?: unknown };
  try {
    body = await req.json() as { id?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || !isPassportSupportStatus(body.status)) {
    return NextResponse.json({ ok: false, error: "Valid request and status required." }, { status: 400 });
  }

  const supabase = database();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Support queue is unavailable." }, { status: 503 });
  }

  const { data: existing, error: readError } = await supabase
    .from("contact_submissions")
    .select("category")
    .eq("id", id)
    .maybeSingle();
  const parsed = parsePassportSupportCategory(existing?.category);
  if (readError || !parsed) {
    return NextResponse.json({ ok: false, error: "Support request not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("contact_submissions")
    .update({ category: passportSupportCategory(parsed.issue, body.status) })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: "Status update failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: body.status,
    status_label: passportSupportStatusLabel(body.status),
  });
}
