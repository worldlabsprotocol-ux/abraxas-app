// FILE: lib/notify/adminResend.ts
// Shared Resend admin notification — never blocks caller on failure.

import { getAdminEmails } from "@/lib/adminAuth";

export interface AdminEmailInput {
  subject: string;
  html: string;
}

function resolveLegacyAdminRecipient(): string | null {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  return adminEmail || null;
}

export function resolveOperationalAdminRecipients(): string[] {
  const allowlist = getAdminEmails();
  if (allowlist.length > 0) return allowlist;
  const legacy = resolveLegacyAdminRecipient();
  return legacy ? [legacy] : [];
}

export function resolveEmailFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return "Abraxas Protocol <onboarding@resend.dev>";
  return from.includes("<") ? from : `Abraxas Protocol <${from}>`;
}

async function sendResendEmail(input: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || input.to.length === 0) {
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
        from: resolveEmailFromAddress(),
        to: input.to,
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

export async function sendAdminEmail(input: AdminEmailInput): Promise<{ ok: boolean; skipped?: boolean }> {
  const legacy = resolveLegacyAdminRecipient();
  if (!legacy) {
    return { ok: true, skipped: true };
  }
  return sendResendEmail({ to: [legacy], subject: input.subject, html: input.html });
}

/** Operational alerts — prefers ABRAXAS_ADMIN_EMAILS, then legacy ADMIN_EMAIL. */
export async function sendOperationalAdminEmail(input: AdminEmailInput): Promise<{ ok: boolean; skipped?: boolean }> {
  return sendResendEmail({
    to: resolveOperationalAdminRecipients(),
    subject: input.subject,
    html: input.html,
  });
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
