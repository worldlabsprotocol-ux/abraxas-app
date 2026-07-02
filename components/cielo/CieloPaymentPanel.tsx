"use client";
// FILE: components/cielo/CieloPaymentPanel.tsx
// Phase 2: pay USDC on Sui + submit tx digest for on-chain verification.

import { useEffect, useState } from "react";
import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

interface BookingPayment {
  booking_id: string;
  status: string;
  est_usdc: number;
  check_in: string;
  check_out: string;
  paid: boolean;
  payment_tx_digest: string | null;
}

interface PaymentInfo {
  treasury_address: string | null;
  treasury_label: string;
  amount_usdc: number;
  memo: string;
  asset: string;
  payable: boolean;
}

export function CieloPaymentPanel({
  bookingId,
  suiAddress,
}: {
  bookingId: string;
  suiAddress?: string | null;
}) {
  const [booking, setBooking] = useState<BookingPayment | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [txDigest, setTxDigest] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ explorer?: string | null } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cielo/booking?booking_id=${encodeURIComponent(bookingId)}`)
      .then(r => r.json())
      .then(d => {
        setBooking(d.booking ?? null);
        setPayment(d.payment ?? null);
      })
      .catch(() => setErr("Could not load booking"));
  }, [bookingId]);

  async function verifyPayment() {
    if (!txDigest.trim()) {
      setErr("Paste your Sui transaction digest");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/cielo/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          tx_digest: txDigest.trim(),
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        verification?: { explorer_url?: string | null };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Verification failed");
      }
      setSuccess({ explorer: data.verification?.explorer_url });
      setBooking(prev => prev ? { ...prev, paid: true, status: "captured" } : prev);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!booking || !payment) {
    return (
      <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>
        Loading payment details…
      </div>
    );
  }

  if (booking.paid || success) {
    return (
      <div style={{
        padding: "1rem", borderRadius: 14, background: `${ACCENT}10`,
        border: `1px solid ${ACCENT}44`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: ACCENT, marginBottom: "0.35rem" }}>
          Payment verified on Sui
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.6 }}>
          Booking {booking.booking_id} is captured. Your stay is confirmed on the Abraxas Protocol Calendar.
        </p>
        {success?.explorer && (
          <a href={success.explorer} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>
            View transaction →
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: "var(--surface)", border: `1px solid ${AMBER}44`,
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: AMBER,
                     letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        Phase 2 · Pay on Sui
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Send {payment.amount_usdc} {payment.asset}
      </div>

      <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.85rem" }}>
        <Row label="Treasury" value={payment.treasury_address ?? payment.treasury_label}
          copyKey="treasury" copied={copied} onCopy={copy} mono />
        <Row label="Memo" value={payment.memo} copyKey="memo" copied={copied} onCopy={copy} mono />
        {suiAddress && (
          <Row label="Your wallet" value={suiAddress} copyKey="wallet" copied={copied} onCopy={copy} mono />
        )}
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
        Send from any Sui wallet. Paste the transaction digest below and Abraxas verifies payment on-chain automatically.
        {!payment.treasury_address && " Set SUI_TREASURY_ADDRESS in Vercel for production."}
      </p>

      <label style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
        TRANSACTION DIGEST
      </label>
      <input value={txDigest} onChange={e => setTxDigest(e.target.value)}
        placeholder="e.g. 8xK2…"
        style={{
          width: "100%", padding: "0.55rem 0.65rem", borderRadius: 8,
          border: "1px solid var(--border)", background: "var(--surface-raised)",
          color: "var(--text-primary)", fontFamily: MONO, fontSize: "0.75rem", boxSizing: "border-box",
          marginBottom: "0.65rem",
        }} />

      {err && (
        <div style={{ color: "#EF4444", fontFamily: FONT, fontSize: "0.72rem", marginBottom: "0.5rem" }}>{err}</div>
      )}

      <button type="button" onClick={verifyPayment} disabled={busy}
        style={{
          width: "100%", padding: "0.65rem", borderRadius: 999, border: "none",
          background: busy ? `${ACCENT}55` : ACCENT, color: "#000",
          fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, cursor: busy ? "wait" : "pointer",
        }}>
        {busy ? "Verifying on Sui…" : "Verify payment →"}
      </button>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.75rem 0 0" }}>
        No wallet yet? <Link href="/passport" style={{ color: ACCENT }}>Create one with Google</Link>
      </p>
    </div>
  );
}

function Row({
  label, value, copyKey, copied, onCopy, mono,
}: {
  label: string;
  value: string;
  copyKey: string;
  copied: string | null;
  onCopy: (t: string, k: string) => void;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", minWidth: 72 }}>{label}</span>
      <code style={{
        flex: 1, fontFamily: mono ? MONO : FONT, fontSize: "0.68rem",
        color: "var(--text-secondary)", wordBreak: "break-all",
      }}>
        {value}
      </code>
      <button type="button" onClick={() => onCopy(value, copyKey)}
        style={{ border: "1px solid var(--border)", background: "transparent", borderRadius: 6,
          padding: "0.2rem 0.45rem", fontSize: "0.62rem", cursor: "pointer", color: "var(--text-muted)" }}>
        {copied === copyKey ? "✓" : "Copy"}
      </button>
    </div>
  );
}
