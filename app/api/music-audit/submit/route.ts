// FILE: app/api/music-audit/submit/route.ts
// Saves artist audit request to Supabase + emails Pablo's team.
// Artists self-submit from /music-audit page.
import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? "";
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface Track {
  title:             string;
  isrc?:             string;
  iswc?:             string;
  pro_registration:  string;
  mlc_registered:    boolean;
  split_sheet_signed: boolean;
  release_year?:     string;
  co_writers:        string;
  distributor:       string;
  gaps:              object[];
}

interface AuditSubmission {
  artist_name:    string;
  contact_email:  string;
  contact_x?:     string;
  distributor?:   string;
  pro_affiliation?: string;
  catalog_size?:  string;
  notes?:         string;
  tracks:         Track[];
  // Summary stats from the frontend audit
  critical_gaps:  number;
  high_gaps:      number;
}

export async function POST(req: NextRequest) {
  const body: AuditSubmission = await req.json().catch(() => null);

  if (!body?.artist_name || !body?.contact_email) {
    return NextResponse.json({ error: "artist_name and contact_email required" }, { status: 400 });
  }

  const resendKey  = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  // Save to Supabase
  let requestId: string | null = null;
  if (SB_URL && SB_ANON) {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });

    const { data: reqData, error: reqErr } = await sb
      .from("music_audit_requests")
      .insert({
        artist_name:    body.artist_name,
        contact_email:  body.contact_email,
        contact_x:      body.contact_x ?? null,
        distributor:    body.distributor ?? null,
        pro_affiliation: body.pro_affiliation ?? null,
        catalog_size:   body.catalog_size ?? null,
        notes:          body.notes ?? null,
        total_tracks:   body.tracks.length,
        critical_gaps:  body.critical_gaps,
        high_gaps:      body.high_gaps,
        status:         "submitted",
        priority:       body.critical_gaps > 0 ? "rush" : "standard",
      })
      .select("id")
      .single();

    if (reqErr) {
      console.error("[music-audit] Supabase insert:", reqErr.message);
    } else {
      requestId = reqData?.id ?? null;

      // Insert tracks in batch
      if (requestId && body.tracks.length > 0) {
        await sb.from("music_audit_tracks").insert(
          body.tracks.map(t => ({
            request_id:         requestId,
            title:              t.title,
            isrc:               t.isrc ?? null,
            iswc:               t.iswc ?? null,
            pro_registration:   t.pro_registration,
            mlc_registered:     t.mlc_registered,
            split_sheet_signed: t.split_sheet_signed,
            release_year:       t.release_year ?? null,
            co_writers:         t.co_writers,
            distributor:        t.distributor,
            gaps:               JSON.stringify(t.gaps),
          }))
        );
      }
    }
  }

  // Email Pablo's team
  if (resendKey && adminEmail) {
    const urgency = body.critical_gaps > 0 ? "🚨 URGENT" : "📋 NEW";
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    "Abraxas Music Audit <onboarding@resend.dev>",
        to:      [adminEmail],
        subject: `${urgency} Music Audit — ${body.artist_name} · ${body.tracks.length} tracks · ${body.critical_gaps} critical gaps`,
        html: `
          <div style="font-family:monospace;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px;max-width:560px">
            <div style="color:#10B981;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px">
              ABRAXAS MUSIC AUDIT — NEW SUBMISSION
            </div>
            <h2 style="font-family:Georgia,serif;font-size:20px;margin:0 0 16px;color:#F8FAFC">
              ${body.artist_name}
            </h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              ${[
                ["Email",         body.contact_email],
                ["X / Twitter",   body.contact_x ?? "—"],
                ["Distributor",   body.distributor ?? "—"],
                ["PRO",           body.pro_affiliation ?? "—"],
                ["Catalog Size",  body.catalog_size ?? "—"],
                ["Tracks Audited",body.tracks.length],
                ["Critical Gaps", body.critical_gaps],
                ["High Priority", body.high_gaps],
                ["Request ID",    requestId ?? "local only"],
              ].map(([k,v]) => `
                <tr>
                  <td style="padding:6px 12px 6px 0;color:#6B7280;font-size:11px;border-bottom:1px solid #1C2333">${k}</td>
                  <td style="padding:6px 0;color:#F8FAFC;font-size:12px;border-bottom:1px solid #1C2333;font-weight:${k==='Critical Gaps'&&Number(v)>0?'bold':'normal'};color:${k==='Critical Gaps'&&Number(v)>0?'#EF4444':'#F8FAFC'}">${v}</td>
                </tr>
              `).join("")}
            </table>
            ${body.critical_gaps > 0 ? `
              <div style="padding:12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;margin-bottom:16px">
                <div style="color:#EF4444;font-size:11px;font-weight:700;margin-bottom:4px">ACTION REQUIRED</div>
                <div style="color:#F8FAFC;font-size:12px">${body.critical_gaps} critical gap${body.critical_gaps>1?'s':''} found. Streams may be untracked. Follow up within 24h.</div>
              </div>
            ` : ""}
            <div style="text-align:center">
              <a href="https://supabase.com/dashboard" style="display:inline-block;padding:10px 24px;background:#10B981;color:#000;border-radius:5px;text-decoration:none;font-size:11px;font-weight:900;letter-spacing:2px">VIEW IN SUPABASE →</a>
            </div>
          </div>
        `,
      }),
    }).catch(() => null);
  }

  return NextResponse.json({
    ok:         true,
    request_id: requestId ?? "saved-locally",
    message:    "Audit request submitted. Our team will review within 48 hours.",
  });
}
