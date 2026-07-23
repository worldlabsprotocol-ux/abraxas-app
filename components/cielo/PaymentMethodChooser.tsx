"use client";
// FILE: components/cielo/PaymentMethodChooser.tsx
// Fiat-first checkout — MoonPay headless Apple Pay default; Ramp fallback; crypto secondary.

import { useEffect, useState } from "react";
import { PAYMENT_METHOD_COPY } from "@/lib/payments/ramp";
import { Spinner } from "@/components/ui/Spinner";
import { ContactlessPayIcon } from "@/components/ui/WalletPassIcon";
import { MoonPayAppleCheckout } from "@/components/payments/MoonPayAppleCheckout";
import type { FiatOnRampProvider } from "@/lib/payments/provider";

import {
  CIELO_FONT,
  CIELO_ACCENT,
} from "./cieloBookingStyles";

export type PaymentMethod = "fiat" | "crypto";

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
  const [showAdvanced, setShowAdvanced] = useState(false);

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

      setRampMsg(data.message ?? "Card checkout is being enabled. We'll email you a payment link.");
      onRampReady?.(null, data.message);
    } catch {
      setRampMsg("Could not open checkout. We'll send a payment link by email.");
      onRampReady?.(null, "Request failed");
    } finally {
      setRampBusy(false);
    }
  }

  const crypto = PAYMENT_METHOD_COPY.crypto;

  if (value === "crypto" && showAdvanced) {
    return (
      <div style={{ marginBottom: compact ? 0 : "0.85rem" }}>
        <button type="button" onClick={() => { onChange("fiat"); setShowAdvanced(false); }}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: CIELO_FONT, fontSize: "0.72rem", color: CIELO_ACCENT, fontWeight: 600, marginBottom: "0.5rem",
          }}>
          ← Back to Apple Pay / card
        </button>
        <div style={{
          padding: "0.75rem", borderRadius: 12,
          border: "1px solid var(--border)", background: "var(--surface-raised)",
        }}>
          <div style={{ fontFamily: CIELO_FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            {crypto.title}
          </div>
          <p style={{ fontFamily: CIELO_FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
            {crypto.subtitle}
          </p>
          <p style={{ fontFamily: CIELO_FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            Continue on the payment page after your booking is confirmed.
          </p>
        </div>
      </div>
    );
  }

  const cryptoLink = (
    <button type="button" onClick={() => { setShowAdvanced(true); onChange("crypto"); }}
      style={{
        marginTop: "0.55rem", background: "none", border: "none", padding: 0,
        cursor: "pointer", fontFamily: CIELO_FONT, fontSize: "0.68rem",
        color: "var(--text-muted)", textDecoration: "underline",
      }}>
      Pay with crypto instead
    </button>
  );

  if (providerLoading) {
    return (
      <div style={{ marginBottom: compact ? 0 : "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Spinner size={16} color={CIELO_ACCENT} />
        <span style={{ fontFamily: CIELO_FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>Loading checkout…</span>
      </div>
    );
  }

  if (provider === "moonpay") {
    return (
      <div style={{ marginBottom: compact ? 0 : "0.85rem" }}>
        <MoonPayAppleCheckout
          amountUsd={amountUsdc}
          suiAddress={suiAddress}
          bookingId={bookingId}
          email={email}
          phoneNumber={phoneNumber}
          compact={compact}
          onComplete={() => onFiatComplete?.()}
        />
        {cryptoLink}
      </div>
    );
  }

  const fiat = PAYMENT_METHOD_COPY.fiat;

  return (
    <div style={{ marginBottom: compact ? 0 : "0.85rem" }}>
      {!compact && (
        <div style={{
          fontFamily: CIELO_FONT, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--text-muted)", marginBottom: "0.5rem",
        }}>
          Payment
        </div>
      )}

      <div style={{
        padding: compact ? "0.65rem 0" : "0.85rem",
        borderRadius: 14,
        background: compact ? "transparent" : "var(--surface)",
        border: compact ? "none" : "1px solid var(--border)",
      }}>
        <div style={{ fontFamily: CIELO_FONT, fontSize: compact ? "0.82rem" : "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
          {fiat.title}
        </div>
        <p style={{ fontFamily: CIELO_FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.6 }}>
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
            fontFamily: CIELO_FONT, fontSize: "0.84rem", fontWeight: 700,
            cursor: rampBusy ? "wait" : "pointer", minHeight: 48,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}>
          {rampBusy ? <Spinner size={16} color="#fff" /> : <ContactlessPayIcon size={18} color="#fff" />}
          {rampBusy ? "Opening checkout…" : "Pay with Apple Pay — we handle the rest"}
        </button>
        {rampMsg && (
          <p style={{ fontFamily: CIELO_FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
            {rampMsg}
          </p>
        )}
      </div>

      {cryptoLink}
    </div>
  );
}
