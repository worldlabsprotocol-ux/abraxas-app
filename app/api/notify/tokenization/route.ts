// FILE: app/api/notify/tokenization/route.ts
// Sends Pablo an email the moment a tokenization request is submitted.
// No CLI, no Edge Functions, no Supabase needed.
// Uses Resend free tier (3,000 emails/month, no credit card).
//
// SETUP (5 min):
//   1. resend.com → sign up free → API Keys → Create key → copy it
//   2. Add to Vercel env vars:
//        RESEND_API_KEY=re_xxxxxxxxxxxx
//        ADMIN_EMAIL=your@email.com
//   3. Redeploy (git push)

import { NextRequest, NextResponse } from "next/server";

interface NotifyBody {
  business_name:       string;
  tier:                string;
  amount_usdc:         number;
  contact_email?:      string | null;
  contact_x?:          string | null;
  sending_wallet?:     string | null;
  request_id?:         string | null;
  source?:             "supabase" | "local";
}

export async function POST(req: NextRequest) {
  const apiKey    = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  // Silent pass-through if not configured — never blocks the form
  if (!apiKey || !adminEmail) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body: NotifyBody = await req.json().catch(() => ({
    business_name: "Unknown",
    tier: "unknown",
    amount_usdc: 0,
  }));

  const subject = `💰 New Abraxas Request — ${body.business_name} · ${body.tier?.toUpperCase()} · $${(body.amount_usdc ?? 0).toLocaleString()}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#040608;font-family:'JetBrains Mono',monospace">
  <div style="max-width:560px;margin:40px auto;background:#0D1117;border:1px solid #1C2333;border-radius:8px;overflow:hidden">

    <div style="background:#030508;padding:20px 24px;border-bottom:1px solid #1C2333">
      <div style="color:#10B981;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:6px">
        ABRAXAS PROTOCOL
      </div>
      <div style="color:#F8FAFC;font-size:18px;font-weight:800">
        New Tokenization Request
      </div>
    </div>

    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse">
        ${[
          ["Business", body.business_name],
          ["Tier",     body.tier?.toUpperCase() ?? "—"],
          ["Amount",   `$${(body.amount_usdc ?? 0).toLocaleString()} USDC`],
          ["Email",    body.contact_email ?? "—"],
          ["X",        body.contact_x ?? "—"],
          ["Wallet",   body.sending_wallet ?? "—"],
          ["Request",  body.request_id ?? "—"],
          ["Source",   body.source ?? "—"],
          ["Time",     new Date().toLocaleString("en-US", { timeZone: "America/New_York" })],
        ].map(([k, v]) => `
          <tr>
            <td style="padding:8px 16px 8px 0;color:#6B7280;font-size:11px;
                       border-bottom:1px solid #1C2333;white-space:nowrap">${k}</td>
            <td style="padding:8px 0;color:#F8FAFC;font-size:12px;
                       border-bottom:1px solid #1C2333;word-break:break-all">${v}</td>
          </tr>
        `).join("")}
      </table>

      <div style="margin-top:24px;padding:16px;background:#040608;border-radius:6px;
                  border-left:3px solid #10B981">
        <div style="color:#10B981;font-size:10px;font-weight:700;
                    letter-spacing:2px;margin-bottom:8px">NEXT STEPS</div>
        <div style="color:#9CA3AF;font-size:12px;line-height:1.8">
          1. Verify USDC received at <strong style="color:#20DCA5">circuit.skr</strong><br>
          2. Update status to 'paid' in Supabase<br>
          3. Begin Wyoming LLC formation process<br>
          4. Reply to client email to confirm receipt
        </div>
      </div>

      <div style="margin-top:20px;text-align:center">
        <a href="https://supabase.com/dashboard"
           style="display:inline-block;padding:10px 24px;background:#10B981;
                  color:#000;border-radius:5px;text-decoration:none;
                  font-size:11px;font-weight:900;letter-spacing:2px">
          VIEW IN SUPABASE →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    "Abraxas Protocol <onboarding@resend.dev>",
        to:      [adminEmail],
        subject,
        html,
      }),
    });

    const data: unknown = await res.json();
    return NextResponse.json({ ok: res.ok, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[notify] Resend error:", message);
    // Never fail loudly — the tokenization form must not break
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
