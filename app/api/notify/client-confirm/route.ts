// FILE: app/api/notify/client-confirm/route.ts
// Sends a branded confirmation email to the client after they submit
// a tokenization request. Makes the flow feel professional and trustworthy.
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: true, skipped: true });

  const { to, business_name, tier, amount_usdc, request_id, treasury } =
    await req.json().catch(() => ({}));

  if (!to) return NextResponse.json({ ok: true });

  const tierMap: Record<string, string> = {
    starter:    "Starter — $1,499 USDC",
    growth:     "Growth — $2,999 USDC",
    enterprise: "Enterprise — $4,999 USDC",
  };

  await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    "Abraxas Protocol <onboarding@resend.dev>",
      to:      [to],
      subject: `Your Abraxas request is confirmed — ${business_name}`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#040608;font-family:system-ui,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#0D1117;border:1px solid #1C2333;border-radius:8px;overflow:hidden">
  <div style="background:#030508;padding:24px;border-bottom:1px solid #1C2333">
    <div style="color:#10B981;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px">
      ABRAXAS PROTOCOL
    </div>
    <div style="color:#F8FAFC;font-size:20px;font-weight:800;font-family:Georgia,serif">
      Your tokenization request is confirmed.
    </div>
  </div>
  <div style="padding:24px">
    <p style="color:#9CA3AF;font-size:13px;line-height:1.7;margin:0 0 20px">
      We have received your Wyoming LLC tokenization request for
      <strong style="color:#F8FAFC">${business_name}</strong>.
      Our team will review your submission and reach out within 24 hours to begin the formation process.
    </p>
    <div style="background:#030508;border:1px solid #1C2333;border-radius:6px;padding:16px;margin-bottom:20px">
      <div style="color:#10B981;font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:12px">
        YOUR REQUEST
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${[
          ["Business", business_name],
          ["Tier", tierMap[tier] ?? tier],
          ["Request ID", request_id],
          ["Status", "Pending Payment Confirmation"],
        ].map(([k,v]) => `
          <tr>
            <td style="padding:6px 12px 6px 0;color:#6B7280;font-size:11px;border-bottom:1px solid #1C2333">${k}</td>
            <td style="padding:6px 0;color:#F8FAFC;font-size:12px;border-bottom:1px solid #1C2333">${v}</td>
          </tr>
        `).join("")}
      </table>
    </div>
    <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:6px;padding:16px;margin-bottom:20px">
      <div style="color:#10B981;font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:8px">
        PAYMENT INSTRUCTIONS
      </div>
      <p style="color:#9CA3AF;font-size:12px;line-height:1.7;margin:0 0 8px">
        Send <strong style="color:#F8FAFC">$${(amount_usdc ?? 0).toLocaleString()} USDC</strong>
        on Solana to the Abraxas treasury wallet:
      </p>
      <div style="font-family:'Courier New',monospace;font-size:14px;font-weight:700;color:#20DCA5;margin-bottom:8px">
        ${treasury ?? "circuit.skr"}
      </div>
      <p style="color:#6B7280;font-size:11px;margin:0">
        This is a Solana Name Service domain — resolves automatically in Phantom, Solflare, and Backpack.
        After sending, reply to this email with your transaction signature.
      </p>
    </div>
    <div style="background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.25);border-radius:6px;padding:16px">
      <div style="color:#3B82F6;font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:8px">
        WHAT HAPPENS NEXT
      </div>
      <ol style="color:#9CA3AF;font-size:12px;line-height:1.8;margin:0;padding-left:18px">
        <li>Treasury confirms USDC receipt</li>
        <li>Wyoming LLC formation begins (same business day)</li>
        <li>Asset enters Abraxas V5 verification pipeline</li>
        <li>Track progress at abraxas-app.vercel.app/dashboard</li>
        <li>Estimated completion: 5–7 business days</li>
      </ol>
    </div>
    <p style="color:#4B5563;font-size:11px;margin-top:20px;text-align:center">
      Questions? Reply to this email or reach us on X: @abraxasxyz
    </p>
  </div>
</div>
</body>
</html>`,
    }),
  }).catch(err => console.error("[client-confirm]", err));

  return NextResponse.json({ ok: true });
}
