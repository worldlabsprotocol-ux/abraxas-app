// FILE: app/api/passport/support/route.ts
// Session-bound Passport support intake and privacy-minimized holder history.

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import {
  isPassportSupportIssue,
  normalizePassportSupportMessage,
  passportSupportCategory,
  passportSupportIssueLabel,
  toPassportSupportHistoryItem,
} from "@/lib/passport/passportSupport";

function supportDatabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

async function resolveHolderEmail(
  supabase: SupabaseClient,
  suiAddress: string,
): Promise<string | null> {
  const { data: identity, error } = await supabase
    .from("sui_zklogin_identities")
    .select("email")
    .eq("sui_address", suiAddress)
    .maybeSingle();

  const email = typeof identity?.email === "string" ? identity.email.trim() : "";
  return !error && email.includes("@") ? email : null;
}

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const supabase = supportDatabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Support is unavailable right now." }, { status: 503 });
  }

  const email = await resolveHolderEmail(supabase, auth.session.suiAddress);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "We could not connect support history to your signed-in account." },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("contact_submissions")
    .select("category,message,created_at")
    .eq("email", email)
    .like("category", "passport-support:%")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ ok: false, error: "Support history is unavailable right now." }, { status: 500 });
  }

  const requests = (data ?? [])
    .map(toPassportSupportHistoryItem)
    .filter(item => item !== null);

  return NextResponse.json({ ok: true, requests });
}

export async function POST(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const rate = checkLaunchpadRateLimit(req, "passport-support", 3, 60 * 60);
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

  const email = await resolveHolderEmail(supabase, auth.session.suiAddress);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "We could not connect this request to your signed-in account." },
      { status: 409 },
    );
  }

  const reference = `PS-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const issueLabel = passportSupportIssueLabel(body.issue_type);
  const { error: insertError } = await supabase.from("contact_submissions").insert({
    name: "Passport holder",
    email,
    organization: null,
    category: passportSupportCategory(body.issue_type),
    message: `[${reference}] ${issueLabel}\n\n${message}`,
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
