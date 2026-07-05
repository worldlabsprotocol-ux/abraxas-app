"use client";
// FILE: components/cielo/PaymentMethodChooser.tsx
// Dual payment UI: fiat on-ramp (Ramp) + USDC on Sui.

import { useState } from "react";
import { PAYMENT_METHOD_COPY } from "@/lib/payments/ramp";
import { Spinner } from "@/components/ui/Spinner";

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
}: {
  amountUsdc: number;
  suiAddress?: string | null;
  bookingId?: string;
  memo?: string;
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  onRampReady?: (sessionUrl: string | null, message?: string) => void;
}) {
  const [rampBusy, setRampBusy] = useState(false);
  const [rampMsg, setRampMsg] = useState<string | null>(null);

  async function startRamp() {
    if (!suiAddress) {
      setRampMsg("Sign in with Google on /passport to receive USDC to your wallet.");
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

      setRampMsg(data.message ?? "Fiat checkout is not configured yet. Use USDC on Sui.");
      onRampReady?.(null, data.message);
    } catch {
      setRampMsg("Could not start fiat checkout.");
      onRampReady?.(null, "Request failed");
    } finally {
      setRampBusy(false);
    }
  }

  const methods: { id: PaymentMethod; copy: (typeof PAYMENT_METHOD_COPY)[PaymentMethod] }[] = [
    { id: "fiat", copy: PAYMENT_METHOD_COPY.fiat },
    { id: "crypto", copy: PAYMENT_METHOD_COPY.crypto },
  ];

  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "var(--text-muted)", marginBottom: "0.5rem",
      }}>
        Choose payment method
      </div>

      <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.65rem" }}>
        {methods.map(m => {
          const active = value === m.id;
          return (
            <button key={m.id} type="button" onClick={() => onChange(m.id)}
              aria-pressed={active}
              style={{
                textAlign: "left", padding: "0.75rem 0.85rem", borderRadius: 12,
                border: `1px solid ${active ? ACCENT : "var(--border)"}`,
                background: active ? "rgba(16,185,129,0.08)" : "var(--surface-raised)",
                cursor: "pointer", minHeight: 44,
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {m.copy.title}
                </span>
                <span style={{
                  fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  color: m.id === "fiat" ? ACCENT : "var(--text-muted)",
                }}>
                  {m.copy.badge}
                </span>
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                {m.copy.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {value === "fiat" && (
        <div style={{
          padding: "0.75rem", borderRadius: 10,
          background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.6 }}>
            You will pay approximately <strong style={{ color: "var(--text-primary)" }}>${amountUsdc.toFixed(2)} USD</strong>
            {" "}(includes conversion spread + network fee — shown in checkout).
          </p>
          <button type="button" onClick={startRamp} disabled={rampBusy}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.45rem",
              padding: "0.55rem 1rem", borderRadius: 999, border: "none",
              background: rampBusy ? `${ACCENT}66` : ACCENT, color: "#000",
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800,
              cursor: rampBusy ? "wait" : "pointer", minHeight: 44,
            }}>
            {rampBusy ? <Spinner size={14} /> : null}
            {rampBusy ? "Opening checkout…" : "Continue with Apple Pay / card →"}
          </button>
          {rampMsg && (
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
              {rampMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
