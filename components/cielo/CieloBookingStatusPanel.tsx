"use client";
// FILE: components/cielo/CieloBookingStatusPanel.tsx
// Phase 5: track booking lifecycle + pay when ready.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BookingLifecycle } from "@/lib/cielo/bookingStatus";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

interface GuestBooking {
  booking_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  nights: number | null;
  est_usdc: number | null;
  status: string;
  property?: string | null;
}

export function CieloBookingStatusPanel({ initialBookingId }: { initialBookingId?: string }) {
  const [bookingId, setBookingId] = useState(initialBookingId ?? "");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<GuestBooking | null>(null);
  const [lifecycle, setLifecycle] = useState<BookingLifecycle | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [network, setNetwork] = useState("mainnet");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!initialBookingId) return;
    fetch(`/api/cielo/status?booking_id=${encodeURIComponent(initialBookingId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setBookingId(initialBookingId);
      })
      .catch(() => null);
  }, [initialBookingId]);

  async function lookup() {
    if (!bookingId.trim() || !email.trim()) {
      setErr("Enter booking ID and the email used at checkout");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/cielo/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId.trim(), email: email.trim() }),
      });
      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        booking?: GuestBooking;
        lifecycle?: BookingLifecycle;
        amount_usdc?: number;
        sui?: { network?: string };
      };
      if (!res.ok || !data.ok || !data.booking || !data.lifecycle) {
        throw new Error(data.error ?? "Could not load booking");
      }
      setBooking(data.booking);
      setLifecycle(data.lifecycle);
      setAmount(data.amount_usdc ?? data.booking.est_usdc);
      setNetwork(data.sui?.network ?? "mainnet");
    } catch (e: unknown) {
      setBooking(null);
      setLifecycle(null);
      setErr(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      {!booking ? (
        <>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: AMBER,
                         letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            Phase 5 · Track your stay
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
            Enter your booking reference and email to see confirmation status and pay when ready.
          </p>
          <Field label="Booking ID">
            <input value={bookingId} onChange={e => setBookingId(e.target.value)}
              placeholder="BKG-…" style={inputStyle} />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </Field>
          {err && <Err msg={err} />}
          <button type="button" onClick={lookup} disabled={busy} style={primaryBtn(busy)}>
            {busy ? "Loading…" : "View status →"}
          </button>
        </>
      ) : lifecycle && (
        <>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                         letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            {booking.booking_id} · {network}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            {booking.guest_name}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            {booking.check_in} → {booking.check_out}
            {booking.nights ? ` · ${booking.nights} nights` : ""}
            {amount != null ? ` · ~${amount} USDC` : ""}
          </p>

          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
            {lifecycle.steps.map(step => (
              <div key={step.id} style={{
                display: "flex", gap: "0.65rem", alignItems: "flex-start",
                padding: "0.55rem 0.65rem", borderRadius: 10,
                background: step.current ? `${AMBER}10` : step.complete ? `${ACCENT}08` : "transparent",
                border: `1px solid ${step.current ? `${AMBER}44` : step.complete ? `${ACCENT}33` : "var(--border)"}`,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  background: step.complete ? ACCENT : step.current ? AMBER : "var(--border)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.55rem", color: "#000", fontWeight: 800,
                }}>
                  {step.complete ? "✓" : step.current ? "●" : ""}
                </span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700 }}>{step.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {lifecycle.payable && (
              <Link href={lifecycle.pay_url} style={ctaBtn(ACCENT, "#000")}>
                Pay now →
              </Link>
            )}
            {lifecycle.receipt_url && (
              <Link href={lifecycle.receipt_url} style={ctaBtn("transparent", ACCENT, ACCENT)}>
                On-chain receipt →
              </Link>
            )}
            <button type="button" onClick={() => { setBooking(null); setLifecycle(null); }}
              style={ctaBtn("transparent", "var(--text-muted)", "var(--border)")}>
              Look up another
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.65rem" }}>
      <label style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div style={{ color: "#EF4444", fontFamily: FONT, fontSize: "0.72rem", marginBottom: "0.5rem" }}>{msg}</div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.65rem", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface-raised)",
  color: "var(--text-primary)", fontFamily: FONT, fontSize: "0.82rem", boxSizing: "border-box",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "0.65rem", borderRadius: 999, border: "none",
    background: disabled ? `${ACCENT}55` : ACCENT, color: "#000",
    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, cursor: disabled ? "wait" : "pointer",
  };
}

function ctaBtn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    padding: "0.55rem 1rem", borderRadius: 999, textDecoration: "none",
    background: bg, color, border: border ? `1px solid ${border}` : "none",
    fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
  };
}
