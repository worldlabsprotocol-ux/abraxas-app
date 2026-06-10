// FILE: app/api/assets/submit/route.ts
// Saves a submitted RWA asset to Supabase + emails Pablo.
// Called from AssetOwnerOnboarding after the Summary step.
import { NextRequest, NextResponse } from "next/server";
import { createClient }             from "@supabase/supabase-js";

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? "";
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface AssetBody {
  session_id:       string;
  local_asset_id:   string;
  asset_type:       string;
  estimated_value?: string;
  jurisdiction?:    string;
  has_liens?:       string;
  has_appraisal?:   string;
  has_custody?:     string;
  description?:     string;
  contact_email?:   string;
  contact_wallet?:  string;
}

export async function POST(req: NextRequest) {
  const body: AssetBody = await req.json().catch(() => ({}));
  if (!body.session_id || !body.asset_type)
    return NextResponse.json({ error: "session_id and asset_type required" }, { status: 400 });

  let assetId: string | null = null;

  if (SB_URL && SB_ANON) {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });
    const { data, error } = await sb.from("submitted_assets").insert({
      session_id:     body.session_id,
      local_asset_id: body.local_asset_id,
      asset_type:     body.asset_type,
      estimated_value: body.estimated_value ?? null,
      jurisdiction:   body.jurisdiction ?? null,
      has_liens:      body.has_liens ?? null,
      has_appraisal:  body.has_appraisal ?? null,
      has_custody:    body.has_custody ?? null,
      description:    body.description ?? null,
      contact_email:  body.contact_email ?? null,
      contact_wallet: body.contact_wallet ?? null,
    }).select("id").single();
    if (!error && data) assetId = data.id;
  }

  // Email Pablo
  const key   = process.env.RESEND_API_KEY;
  const admin = process.env.ADMIN_EMAIL;
  if (key && admin) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    "Abraxas Protocol <onboarding@resend.dev>",
        to:      [admin],
        subject: `New Asset Submission — ${body.asset_type} · ${body.estimated_value ?? "value not specified"}`,
        html: `<div style="font-family:monospace;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px">
          <div style="color:#10B981;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px">ABRAXAS — NEW ASSET SUBMISSION</div>
          <table style="width:100%;border-collapse:collapse">
            ${Object.entries({
              "Asset Type":    body.asset_type,
              "Value":         body.estimated_value ?? "—",
              "Jurisdiction":  body.jurisdiction    ?? "—",
              "Liens":         body.has_liens       ?? "—",
              "Appraisal":     body.has_appraisal   ?? "—",
              "Custody":       body.has_custody     ?? "—",
              "Email":         body.contact_email   ?? "—",
              "Wallet":        body.contact_wallet  ?? "—",
              "Supabase ID":   assetId              ?? "local only",
              "Local ID":      body.local_asset_id,
            }).map(([k,v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:11px;border-bottom:1px solid #1C2333">${k}</td><td style="padding:6px 0;color:#F8FAFC;font-size:12px;border-bottom:1px solid #1C2333">${v}</td></tr>`).join("")}
          </table>
        </div>`,
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, asset_id: assetId ?? body.local_asset_id });
}
