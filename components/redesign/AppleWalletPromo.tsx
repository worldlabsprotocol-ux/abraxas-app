"use client";
// FILE: components/redesign/AppleWalletPromo.tsx
// Apple Wallet CTA — honest pilot wording + non-Apple path.

import { AddToAppleWalletButton } from "@/components/ui/AddToAppleWalletButton";
import { ContactlessPayIcon, VerifiedCheckIcon, WalletPassIcon } from "@/components/ui/WalletPassIcon";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function AppleWalletPromo() {
  return (
    <section aria-labelledby="apple-wallet-promo" style={{
      padding: "1.5rem 1.35rem",
      borderRadius: 18,
      background: "linear-gradient(135deg, #0a0a0a 0%, #121218 55%, #0a1210 100%)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "1.5rem",
        alignItems: "center",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            <div style={{
              fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}>
              Apple Wallet · supported check-in surface
            </div>
            <CapabilityStatusBadge status="pilot" size="xs" />
          </div>
          <h2 id="apple-wallet-promo" style={{
            fontFamily: FONT, fontSize: "clamp(1.15rem, 2.8vw, 1.45rem)", fontWeight: 800,
            letterSpacing: "-0.02em", color: "#fff", margin: "0 0 0.5rem", lineHeight: 1.15,
          }}>
            Add an Abraxas pass for partner check-in and verification
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.72)",
            lineHeight: 1.6, margin: "0 0 0.65rem", maxWidth: 420,
          }}>
            The pass displays current credential status. Partners validate the underlying signed
            credential through Abraxas — not the pass artwork alone.
          </p>
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.5)",
            lineHeight: 1.55, margin: "0 0 1.1rem", maxWidth: 420,
          }}>
            No iPhone? Use the browser QR flow on Passport — same verifier, any device.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
            <AddToAppleWalletButton href="/passport#apple-wallet" variant="primary" size="lg">
              Add to Apple Wallet
            </AddToAppleWalletButton>
            <Btn href="/passport#qr-verify" variant="tertiary" size="lg">Browser QR flow</Btn>
            <Btn href="/passport" variant="tertiary" size="lg">Create passport</Btn>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <div style={{
            width: 168, borderRadius: 16, overflow: "hidden",
            background: "linear-gradient(160deg, #111820 0%, #0a1210 100%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
          }}>
            <div style={{
              padding: "0.85rem 0.9rem",
              background: "linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0.05) 100%)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <WalletPassIcon size={18} color="#10B981" />
                <span style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, color: "#fff", letterSpacing: "0.04em" }}>
                  ABRAXAS PASSPORT
                </span>
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                Passport Core · Visual preview
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: 4 }}>
                <CapabilityStatusBadge status="pilot" size="xs" />
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                did:sui:…abx7f2
              </div>
            </div>
            <div style={{ padding: "0.75rem 0.9rem", display: "grid", gap: "0.45rem" }}>
              {[
                { Icon: VerifiedCheckIcon, label: "Status display · not source of truth" },
                { Icon: ContactlessPayIcon, label: "Checkout via partner flow (pilot)" },
              ].map(({ Icon, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <Icon size={14} color="#10B981" />
                  <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.75)" }}>
                    {label}
                  </span>
                </div>
              ))}
              <div style={{
                marginTop: "0.35rem", padding: "0.45rem", borderRadius: 8,
                background: "rgba(0,0,0,0.35)", border: "1px dashed rgba(255,255,255,0.15)",
                textAlign: "center",
              }}>
                <span style={{ fontFamily: MONO, fontSize: "0.42rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
                  QR → /verify (live)
                </span>
              </div>
            </div>
          </div>

          <div style={{
            flex: "1 1 140px", maxWidth: 200, padding: "0.85rem",
            borderRadius: 14, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            {[
              { step: "Sign in with Google", status: "live" as const },
              { step: "Optional ID when needed", status: "pilot" as const },
              { step: "Add to Apple Wallet", status: "pilot" as const },
              { step: "Partners scan QR → verifier", status: "live" as const },
            ].map(({ step, status }, i) => (
              <div key={step} style={{
                display: "flex", gap: "0.55rem", alignItems: "flex-start",
                padding: "0.4rem 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.08)" : undefined,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(16,185,129,0.2)", color: "#10B981",
                  fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.45, display: "block" }}>
                    {step}
                  </span>
                  <CapabilityStatusBadge status={status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
