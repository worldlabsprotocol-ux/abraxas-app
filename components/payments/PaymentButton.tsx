// FILE: components/payments/PaymentButton.tsx
// Drop-in payment button. wraps any Abraxas product in Stripe Checkout.
// Shows Apple Pay / Google Pay icons automatically when available.
// Usage:
//   <PaymentButton product="wyoming_starter" label="START TOKENIZATION" />
//   <PaymentButton product="asset_verification" label="PAY & SUBMIT" email={userEmail} />
"use client";

import { useState } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";

const PRICES: Record<string, string> = {
  wyoming_starter:    "$1,499",
  wyoming_growth:     "$2,999",
  wyoming_enterprise: "$4,999",
  asset_verification: "$500",
  music_audit:        "$299",
};

interface PaymentButtonProps {
  product:        string;
  label?:         string;
  email?:         string;
  metadata?:      Record<string, string>;
  customAmount?:  number;       // in cents, for dynamic pricing
  variant?:       "primary" | "secondary";
  fullWidth?:     boolean;
  onSuccess?:     () => void;
}

export function PaymentButton({
  product, label, email, metadata, customAmount,
  variant = "primary", fullWidth = false, onSuccess,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, email, metadata, custom_amount: customAmount }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Payment unavailable. Please try again.");
        return;
      }
      // Redirect to Stripe Checkout (hosted, PCI-compliant)
      window.location.href = data.url;
      onSuccess?.();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const price = PRICES[product];

  const primary: React.CSSProperties = {
    padding: "0.625rem 1.25rem", borderRadius: 5, border: "none",
    background: G, color: "#000", fontFamily: M,
    fontSize: "0.78rem", fontWeight: 900, cursor: loading ? "wait" : "pointer",
    letterSpacing: "0.05em", textTransform: "uppercase",
    boxShadow: `0 0 16px ${G}40`,
    width: fullWidth ? "100%" : undefined,
    opacity: loading ? 0.7 : 1,
    transition: "opacity 0.15s",
  };

  const secondary: React.CSSProperties = {
    ...primary,
    background: "transparent",
    color: G,
    border: `1px solid ${G}40`,
    boxShadow: "none",
  };

  return (
    <div style={{ display: "inline-block", width: fullWidth ? "100%" : undefined }}>
      <button onClick={handlePay} disabled={loading}
        style={variant === "primary" ? primary : secondary}>
        {loading ? "REDIRECTING…" : label ?? `PAY ${price ?? ""} →`}
      </button>
      {/* Payment method icons */}
      <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.375rem",
                     alignItems: "center", flexWrap: "wrap" }}>
        {["VISA","MC","AMEX","APPLE PAY","GOOGLE PAY","KLARNA","AFTERPAY"].map(m => (
          <div key={m} style={{ padding: "1px 5px", borderRadius: 3,
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  fontFamily: M, fontSize: "0.42rem",
                                  color: "rgba(255,255,255,0.25)",
                                  letterSpacing: "0.05em" }}>
            {m}
          </div>
        ))}
      </div>
      {error && (
        <div style={{ fontFamily: M, fontSize: "0.6rem", color: "#EF4444",
                       marginTop: "0.375rem", letterSpacing: "0.04em" }}>
          {error}
        </div>
      )}
    </div>
  );
}
