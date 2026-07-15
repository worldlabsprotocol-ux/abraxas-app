"use client";
// FILE: components/cielo/PaymentMethodChooser.tsx
// USDC on Sui first — Apple Pay / card as convenience layer.

import { useEffect, useState } from "react";
import { PAYMENT_METHOD_COPY } from "@/lib/payments/ramp";
import { Spinner } from "@/components/ui/Spinner";
import { ContactlessPayIcon } from "@/components/ui/WalletPassIcon";
import { MoonPayAppleCheckout } from "@/components/payments/MoonPayAppleCheckout";
import type { FiatOnRampProvider } from "@/lib/payments/provider";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export type PaymentMethod = "fiat" | "crypto";

function MethodToggle({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.65rem" }}>
      {(["crypto", "fiat"] as const).map(id => {
        const active = value === id;
        const label = id === "crypto" ? "USDC on Sui" : "Card / Apple Pay";
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            style={{
              flex: 1, padding: "0.45rem 0.65rem", borderRadius: 999,
              border: `1px solid ${active ? `${ACCENT}66` : "var(--border)"}`,
              background: active ? `${ACCENT}14` : "transparent",
              color: active ? ACCENT : "var(--text-muted)",
              fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function PaymentMethodChooser({
  amountUsdc,
  suiAddress,
  bookingId,
  memo,
  email,
  phoneNumber,
  value,
  onChange,
  onRampReady,
  onFiatComplete,
  compact = false,
}: {
  amountUsdc: number;
  suiAddress?: string | null;
  bookingId?: string;
  memo?: string;
  email?: string;
  phoneNumber?: string;
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  onRampReady?: (sessionUrl: string | null, message?: string) => void;
  onFiatComplete?: () => void;
  compact?: boolean;
}) {
  const [provider, setProvider] = useState<FiatOnRampProvider>("none");
  const [providerLoading, setProviderLoading] = useState(true);
  const [rampBusy, setRampBusy] = useState(false);
  const [rampMsg, setRampMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/payments/provider")
      .then(r => r.json())
      .then(d => setProvider((d.provider as FiatOnRampProvider) ?? "none"))
      .catch(() => setProvider("none"))
      .finally(() => setProviderLoading(false));
  }, []);

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

      setRampMsg(data.message ?? "Card checkout opens after confirmation — we'll email a secure link.");
      onRampReady?.(null, data.message);
    } catch {
      setRampMsg("Could not open checkout. We'll send a payment link by email.");
      onRampReady?.(null, "Request failed");
    } finally {
      setRampBusy(false);
    }
  }

  const crypto = PAYMENT_METHOD_COPY.crypto;
  const fiat = PAYMENT_METHOD_COPY.fiat;

  if (providerLoading) {
    return (
      <div style={{ marginBottom: compact ? 0 : "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Spinner size={16} color={ACCENT} />
        <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>Loading checkout…</span>
      </div>
    );
  }

  if (value === "crypto") {
    return (
      <div style={{ marginBottom: compact ? 0 : "0.85rem" }}>
        <MethodToggle value={value} onChange={onChange} />
        <div style={{
          padding: compact ? "0.65rem 0" : "0.85rem",
          borderRadius: 14,
          background: compact ? "transparent" : `${ACCENT}08`,
          border: compact ? "none" : `1px solid ${ACCENT}33`,
        }}>
          <div style={{ fontFamily: FONT, fontSize: compact ? "0.82rem" : "0.92rem", fontWeight: 800, color: ACCENT, marginBottom: "0.35rem" }}>
            {crypto.title}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.6 }}>
            Pay <strong style={{ color: "var(--text-primary)" }}>{amountUsdc.toFixed(2)} USDC</strong>
            {" "}— settles on Sui after confirmation. Live today on the Cielo pilot.
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            {crypto.subtitle}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: compact ? 0 : "0.85rem" }}>
      <MethodToggle value={value} onChange={onChange} />
      {!compact && (
        <div style={{
          fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--text-muted)", marginBottom: "0.5rem",
        }}>
          Convenience checkout
        </div>
      )}

      {provider === "moonpay" ? (
        <MoonPayAppleCheckout
          amountUsd={amountUsdc}
          suiAddress={suiAddress}
          bookingId={bookingId}
          email={email}
          phoneNumber={phoneNumber}
          compact={compact}
          onComplete={() => onFiatComplete?.()}
        />
      ) : (
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
            {fiat.subtitle} · <strong style={{ color: "var(--text-primary)" }}>${amountUsdc.toFixed(2)}</strong>
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
            }}>
            {rampBusy ? <Spinner size={16} color="#fff" /> : <ContactlessPayIcon size={18} color="#fff" />}
            {rampBusy ? "Opening checkout…" : fiat.cta}
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
