"use client";
// FILE: components/redesign/AppleWalletPromo.tsx
// Hero-level Apple Wallet CTA — Revolut-like native identity.

import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function AppleWalletPromo() {
  return (
    <section aria-labelledby="apple-wallet-promo" style={{
      padding: "1.35rem 1.25rem",
      borderRadius: 18,
      background: "linear-gradient(135deg, #0a0a0a 0%, #121218 55%, #0a1210 100%)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "1.25rem",
        alignItems: "center",
      }}>
        <div>
          <div style={{
            fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)", marginBottom: "0.5rem",
          }}>
            Like your Revolut card — but for verified RWAs
          </div>
          <h2 id="apple-wallet-promo" style={{
            fontFamily: FONT, fontSize: "clamp(1.15rem, 2.8vw, 1.45rem)", fontWeight: 800,
            letterSpacing: "-0.02em", color: "#fff", margin: "0 0 0.5rem", lineHeight: 1.15,
          }}>
            Carry your verified Passport in Apple Wallet
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.72)",
            lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 440,
          }}>
            Sign in once. Add your pass. Show verified status at booking, check-in, or partner flows —
            without explaining how verification works.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href="/passport#apple-wallet" size="lg">Add to Apple Wallet →</Btn>
            <Btn href="/passport" variant="tertiary" size="lg">Create passport</Btn>
          </div>
        </div>

        <div style={{
          padding: "1rem", borderRadius: 14,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        }}>
          {[
            "Sign in with Google",
            "Optional ID check when needed",
            "Tap Add to Apple Wallet",
            "Partners verify via QR — no re-upload",
          ].map((step, i) => (
            <div key={step} style={{
              display: "flex", gap: "0.65rem", alignItems: "flex-start",
              padding: "0.45rem 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.08)" : undefined,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "rgba(16,185,129,0.2)", color: "#10B981",
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
