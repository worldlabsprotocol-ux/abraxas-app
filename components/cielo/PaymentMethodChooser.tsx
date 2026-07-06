"use client";
// FILE: components/cielo/PaymentMethodChooser.tsx
// Fiat-first checkout — Apple Pay default; crypto as a tiny secondary link.

import { useState } from "react";
import { PAYMENT_METHOD_COPY } from "@/lib/payments/ramp";
import { Spinner } from "@/components/ui/Spinner";
import { ContactlessPayIcon } from "@/components/ui/WalletPassIcon";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export type PaymentMethod = "fiat" | "crypto";

export function PaymentMethodChooser({
  amountUsdc,
  suiAddress,
  bookingId,
  memo,
  value,
  onChange,
  onRampReady,
  compact = false,
}: {
  amountUsdc: number;
  suiAddress?: string | null;
  bookingId?: string;
  memo?: string;
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  onRampReady?: (sessionUrl: string | null, message?: string) => void;
  compact?: boolean;
}) {
  const [rampBusy, setRampBusy] = useState(false);
  const [rampMsg, setRampMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function startRamp() {
    if (!suiAddress) {
      setRampMsg("Sign in with Google first — we'll handle the rest at checkout.");
      onRampReady?.(null, "Sign in required");
      return;
    }

    setRampBusy(true);
    setRampMsg(null);
    try {
      const res = await fetch("/api/payments/ramp-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sui_address: suiAddress,
          amount_usd: amountUsdc,
          booking_id: bookingId,
          memo,
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        configured?: boolean;
        sessionUrl?: string;
        message?: string;
      };

      if (data.configured && data.sessionUrl) {
        onRampReady?.(data.sessionUrl);
        window.open(data.sessionUrl, "_blank", "noopener,noreferrer");
        return;
      }

      setRampMsg(data.message ?? "Card checkout is being enabled. We'll email you a payment link.");
      onRampReady?.(null, data.message);
    } catch {
      setRampMsg("Could not open checkout. We'll send a payment link by email.");
      onRampReady?.(null, "Request failed");
    } finally {
      setRampBusy(false);
    }
  }

  const fiat = PAYMENT_METHOD_COPY.fiat;
  const crypto = PAYMENT_METHOD_COPY.crypto;

  if (value === "crypto" && showAdvanced) {
    return (
      <div style={{ marginBottom: compact ? 0 : "0.85rem" }}>
        <button type="button" onClick={() => { onChange("fiat"); setShowAdvanced(false); }}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, fontWeight: 600, marginBottom: "0.5rem",
          }}>
          ← Back to Apple Pay / card
        </button>
        <div style={{
          padding: "0.75rem", borderRadius: 12,
          border: "1px solid var(--border)", background: "var(--surface-raised)",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            {crypto.title}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
            {crypto.subtitle}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            Continue on the payment page after your booking is confirmed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: compact ? 0 : "0.85rem" }}>
      {!compact && (
        <div style={{
          fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--text-muted)", marginBottom: "0.5rem",
        }}>
          Payment
        </div>
      )}

      <div style={{
        padding: compact ? "0.65rem 0" : "0.85rem",
        borderRadius: 14,
        background: compact ? "transparent" : "rgba(59,130,246,0.06)",
        border: compact ? "none" : "1px solid rgba(59,130,246,0.22)",
      }}>
        <div style={{ fontFamily: FONT, fontSize: compact ? "0.82rem" : "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
          {fiat.title}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.6 }}>
          Pay <strong style={{ color: "var(--text-primary)" }}>${amountUsdc.toFixed(2)}</strong>
          {" "}in your currency — we handle the rest. No wallet setup needed.
        </p>
        <button type="button" onClick={startRamp} disabled={rampBusy}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            width: compact ? "100%" : "auto",
            justifyContent: "center",
            padding: "0.7rem 1.25rem", borderRadius: 999, border: "none",
            background: rampBusy ? "#333" : "#000", color: "#fff",
            fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700,
            cursor: rampBusy ? "wait" : "pointer", minHeight: 48,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}>
          {rampBusy ? <Spinner size={16} color="#fff" /> : <ContactlessPayIcon size={18} color="#fff" />}
          {rampBusy ? "Opening checkout…" : "Pay with Apple Pay — we handle the rest"}
        </button>
        {rampMsg && (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
            {rampMsg}
          </p>
        )}
      </div>

      <button type="button" onClick={() => { setShowAdvanced(true); onChange("crypto"); }}
        style={{
          marginTop: "0.55rem", background: "none", border: "none", padding: 0,
          cursor: "pointer", fontFamily: FONT, fontSize: "0.68rem",
          color: "var(--text-muted)", textDecoration: "underline",
        }}>
        Pay with crypto instead
      </button>
    </div>
  );
}
