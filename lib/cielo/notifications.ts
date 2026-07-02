// FILE: lib/cielo/notifications.ts
// Phase 4: guest + operator emails for pay link and captured payment.

import { getSuiNetwork, suiExplorerTxUrl } from "@/lib/sui/network";
import { getCieloTreasuryLabel } from "@/lib/cielo/treasury";

const FROM_OPS = "Abraxas Protocol <onboarding@resend.dev>";
const FROM_GUEST = "Cielo Sunrise via Abraxas <onboarding@resend.dev>";

function appOrigin(): string {
  const base =
    process.env.ABRAXAS_ISSUER_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://abraxas-app.vercel.app";
  return base.replace(/\/$/, "");
}

async function sendResend(to: string[], subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || to.length === 0) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_GUEST, to, subject, html }),
  }).catch(() => null);
}

export async function emailGuestPaymentLink(stay: {
  booking_id: string;
  guest_name: string;
  email: string;
  check_in: string;
  check_out: string;
  est_usdc: number | null;
  nights?: number | null;
}): Promise<void> {
  const payUrl = `${appOrigin()}/cielo/pay?booking_id=${encodeURIComponent(stay.booking_id)}`;
  const amount = stay.est_usdc ?? 0;
  const network = getSuiNetwork();
  const treasury = getCieloTreasuryLabel();

  const html = `<div style="font-family:system-ui,sans-serif;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px;max-width:520px">
    <div style="color:#F59E0B;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:12px">CIELO SUNRISE · PAYMENT READY</div>
    <div style="font-size:22px;font-weight:700;margin-bottom:12px">Your dates are confirmed.</div>
    <p style="color:#9CA3AF;font-size:13px;line-height:1.7">
      Pay <strong style="color:#F59E0B">${amount} USDC</strong> on Sui ${network} to complete your stay.
      One-click pay works from your zkLogin wallet on Abraxas.
    </p>
    <a href="${payUrl}" style="display:inline-block;margin:16px 0;padding:12px 20px;background:#10B981;color:#000;font-weight:800;border-radius:999px;text-decoration:none">
      Pay now →
    </a>
    <div style="background:#0D1117;border:1px solid #1C2333;border-radius:6px;padding:16px;margin:16px 0;font-size:13px">
      <p style="margin:0 0 6px;color:#6B7280;font-size:11px">STAY</p>
      <p style="margin:0 0 4px">${stay.check_in} → ${stay.check_out}</p>
      <p style="margin:0 0 4px">Treasury label: ${treasury}</p>
      <p style="margin:0;color:#4B5563;font-size:11px">Booking ${stay.booking_id}</p>
    </div>
  </div>`;

  await sendResend([stay.email], `Pay for Cielo Sunrise — ${stay.check_in} to ${stay.check_out}`, html);
}

export async function emailPaymentCaptured(stay: {
  booking_id: string;
  guest_name: string;
  email: string;
  check_in: string;
  check_out: string;
  est_usdc: number | null;
  payment_tx_digest: string;
  paid_amount_usdc?: number | null;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const explorer = suiExplorerTxUrl(stay.payment_tx_digest);
  const paid = stay.paid_amount_usdc ?? stay.est_usdc ?? 0;
  const network = getSuiNetwork();

  const guestHtml = `<div style="font-family:system-ui,sans-serif;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px;max-width:520px">
    <div style="color:#10B981;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:12px">PAYMENT VERIFIED ON SUI</div>
    <div style="font-size:22px;font-weight:700;margin-bottom:12px">You're confirmed for Cielo Sunrise.</div>
    <p style="color:#9CA3AF;font-size:13px;line-height:1.7">
      ${paid} USDC received on Sui ${network}. Your stay is locked on the Abraxas Protocol Calendar.
    </p>
    <div style="background:#0D1117;border:1px solid #1C2333;border-radius:6px;padding:16px;margin:16px 0;font-size:13px">
      <p style="margin:0 0 4px">${stay.check_in} → ${stay.check_out}</p>
      <p style="margin:0 0 4px">Booking ${stay.booking_id}</p>
      <a href="${explorer}" style="color:#10B981;font-size:12px">View on-chain receipt →</a>
    </div>
  </div>`;

  await sendResend(
    [stay.email],
    `Cielo confirmed — ${stay.check_in} to ${stay.check_out}`,
    guestHtml,
  );

  const admin = process.env.ADMIN_EMAIL;
  if (!admin) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_OPS,
      to: [admin],
      subject: `Cielo captured · ${stay.guest_name} · ${paid} USDC`,
      html: `<div style="font-family:monospace;background:#040608;color:#F8FAFC;padding:24px">
        <p>Booking ${stay.booking_id} captured on Sui ${network}.</p>
        <p>Guest: ${stay.guest_name} · ${stay.email}</p>
        <p>Amount: ${paid} USDC</p>
        <p><a href="${explorer}">${stay.payment_tx_digest}</a></p>
      </div>`,
    }),
  }).catch(() => null);
}
