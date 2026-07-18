// FILE: lib/notify/adminResend.ts
// Shared Resend admin notification — never blocks caller on failure.

export interface AdminEmailInput {
  subject: string;
  html: string;
}

export async function sendAdminEmail(input: AdminEmailInput): Promise<{ ok: boolean; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey || !adminEmail) {
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Abraxas Protocol <onboarding@resend.dev>",
        to: [adminEmail],
        subject: input.subject,
        html: input.html,
      }),
    });

    return { ok: res.ok };
  } catch (err) {
    console.error("[adminResend]", err instanceof Error ? err.message : err);
    return { ok: false };
  }
}

export function adminEmailTable(rows: Record<string, string | number | null | undefined>): string {
  return Object.entries(rows)
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#6B7280;font-size:11px;border-bottom:1px solid #1C2333;white-space:nowrap">${k}</td>
          <td style="padding:6px 0;color:#F8FAFC;font-size:12px;border-bottom:1px solid #1C2333;word-break:break-all">${v ?? "—"}</td>
        </tr>`,
    )
    .join("");
}

export function adminEmailShell(title: string, tableHtml: string): string {
  return `<div style="font-family:monospace;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px">
    <div style="color:#E8C547;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px">ABRAXAS PROTOCOL</div>
    <div style="color:#F8FAFC;font-size:16px;font-weight:800;margin-bottom:12px">${title}</div>
    <table style="width:100%;border-collapse:collapse">${tableHtml}</table>
  </div>`;
}
