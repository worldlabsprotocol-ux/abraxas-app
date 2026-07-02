"use client";
// FILE: components/cielo/CieloReceiptPanel.tsx
// Phase 6: shareable on-chain payment receipt.

import { useEffect, useState } from "react";
import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface Receipt {
  booking_id: string;
  property: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  nights: number | null;
  amount_usdc: number;
  asset: string;
  network: string;
  treasury_label: string;
  treasury_address: string | null;
  payment_tx_digest: string;
  payment_verified_at: string | null;
  explorer_url: string;
  calendar: string;
  attestation: string;
}

export function CieloReceiptPanel({ bookingId }: { bookingId: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cielo/receipt?booking_id=${encodeURIComponent(bookingId)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok || !d.receipt) {
          throw new Error(d.error ?? "Receipt not available");
        }
        setReceipt(d.receipt as Receipt);
      })
      .catch(e => setErr(e instanceof Error ? e.message : "Could not load receipt"));
  }, [bookingId]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (err) {
    return (
      <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
        {err}
        <div style={{ marginTop: "0.75rem" }}>
          <Link href={`/cielo/pay?booking_id=${encodeURIComponent(bookingId)}`} style={{ color: ACCENT }}>
            Go to payment →
          </Link>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading receipt…</div>;
  }

  return (
    <div style={{
      padding: "1.25rem", borderRadius: 16,
      background: `${ACCENT}08`, border: `1px solid ${ACCENT}44`,
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                     letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        Phase 6 · On-chain receipt · Sui {receipt.network}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.35rem" }}>
        {receipt.property}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
        {receipt.guest_name} · {receipt.check_in} → {receipt.check_out}
        {receipt.nights ? ` · ${receipt.nights} nights` : ""}
      </p>

      <div style={{
        display: "grid", gap: "0.5rem", marginBottom: "1rem",
        padding: "0.85rem", borderRadius: 12, background: "var(--surface)",
        border: "1px solid var(--border)",
      }}>
        <Row label="Paid" value={`${receipt.amount_usdc} ${receipt.asset}`} accent />
        <Row label="Booking" value={receipt.booking_id} mono copyKey="bid" copied={copied} onCopy={copy} />
        <Row label="Attestation" value={receipt.attestation} mono copyKey="memo" copied={copied} onCopy={copy} />
        <Row label="Treasury" value={receipt.treasury_address ?? receipt.treasury_label} mono copyKey="treasury" copied={copied} onCopy={copy} />
        <Row label="Tx digest" value={receipt.payment_tx_digest} mono copyKey="tx" copied={copied} onCopy={copy} />
        {receipt.payment_verified_at && (
          <Row label="Verified" value={new Date(receipt.payment_verified_at).toLocaleString()} />
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <a href={receipt.explorer_url} target="_blank" rel="noopener noreferrer"
          style={btn(ACCENT, "#000")}>
          View on Suiscan →
        </a>
        <Link href={`/cielo/status?booking_id=${encodeURIComponent(receipt.booking_id)}`}
          style={btn("transparent", ACCENT, ACCENT)}>
          Booking status
        </Link>
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "1rem 0 0", lineHeight: 1.5 }}>
        Calendar source: Abraxas Protocol Calendar · {receipt.calendar}
      </p>
    </div>
  );
}

function Row({
  label, value, mono, accent, copyKey, copied, onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  copyKey?: string;
  copied?: string | null;
  onCopy?: (t: string, k: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", minWidth: 72 }}>{label}</span>
      <code style={{
        flex: 1, fontFamily: mono ? MONO : FONT, fontSize: "0.68rem",
        color: accent ? ACCENT : "var(--text-secondary)", wordBreak: "break-all",
      }}>
        {value}
      </code>
      {copyKey && onCopy && (
        <button type="button" onClick={() => onCopy(value, copyKey)}
          style={{ border: "1px solid var(--border)", background: "transparent", borderRadius: 6,
            padding: "0.2rem 0.45rem", fontSize: "0.62rem", cursor: "pointer", color: "var(--text-muted)" }}>
          {copied === copyKey ? "✓" : "Copy"}
        </button>
      )}
    </div>
  );
}

function btn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    padding: "0.55rem 1rem", borderRadius: 999, textDecoration: "none",
    background: bg, color, border: border ? `1px solid ${border}` : "none",
    fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
  };
}
