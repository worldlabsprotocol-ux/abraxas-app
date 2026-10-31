// FILE: app/api/passport/support/route.ts
// Session-bound Passport support intake and privacy-minimized holder history.

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import {
  isPassportSupportIssue,
  isPassportSupportStatus,
  normalizePassportSupportMessage,
  passportSupportIssueLabel,
  passportSupportStatusLabel,
} from "@/lib/passport/passportSupport";

function supportDatabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const auth = await resolveAuthenticatedHolderSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.error === "forbidden" ? 403 : 401 });
  }

  const supabase = supportDatabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Support is unavailable right now." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("passport_subject_support_requests")
    .select("reference,issue_type,status,created_at")
    .eq("holder_subject_id", auth.subjectId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ ok: false, error: "Support history is unavailable right now." }, { status: 500 });
  }

  const requests = (data ?? []).flatMap(row => {
    if (!isPassportSupportIssue(row.issue_type) || !isPassportSupportStatus(row.status)) return [];
    return [{
      reference: row.reference,
      issue_type: row.issue_type,
      issue_label: passportSupportIssueLabel(row.issue_type),
      status: row.status,
      status_label: passportSupportStatusLabel(row.status),
      submitted_at: row.created_at,
    }];
  });

  return NextResponse.json({ ok: true, requests });
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuthenticatedHolderSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.error === "forbidden" ? 403 : 401 });
  }

  const rate = await checkLaunchpadRateLimit(req, "passport-support", 3, 60 * 60);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many support requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let body: { issue_type?: unknown; message?: unknown };
  try {
    body = await req.json() as { issue_type?: unknown; message?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!isPassportSupportIssue(body.issue_type)) {
    return NextResponse.json({ ok: false, error: "Choose what you need help with." }, { status: 400 });
  }
  const message = normalizePassportSupportMessage(body.message);
  if (!message) {
    return NextResponse.json(
      { ok: false, error: "Add 10 to 2,000 characters describing what happened." },
      { status: 400 },
    );
  }

  const supabase = supportDatabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Support is unavailable right now." }, { status: 503 });
  }

  const reference = `PS-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const { error: insertError } = await supabase.from("passport_subject_support_requests").insert({
    id: `ps_${randomUUID().replace(/-/g, "")}`,
    holder_subject_id: auth.subjectId,
    reference,
    issue_type: body.issue_type,
    status: "received",
    message,
  });

  if (insertError) {
    return NextResponse.json({ ok: false, error: "We could not save your request. Try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    reference,
    message: "Your request is saved in the Abraxas support queue.",
  });
}
