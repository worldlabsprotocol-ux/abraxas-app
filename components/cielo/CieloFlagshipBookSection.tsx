"use client";
// FILE: components/cielo/CieloFlagshipBookSection.tsx
// Flagship booking — property context + inline date picker (no legacy calendar grid).

import Link from "next/link";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { CieloBookingPanel } from "./CieloBookingPanel";
import { CIELO_BOOKING_HIGHLIGHTS, CIELO_GUEST_ESSENTIALS } from "@/lib/cielo/flagshipHighlights";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function Inner() {
  const { suiAddress } = useSuiAuth();
  const H = CIELO_BOOKING_HIGHLIGHTS;

  return (
    <div id="book" style={{ marginTop: "2rem" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        gap: "1.25rem",
        alignItems: "start",
      }}>
        {/* Property context */}
        <div style={{
          padding: "1.15rem 1.25rem",
          borderRadius: 16,
          background: "rgba(18,26,22,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700, color: ACCENT,
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.45rem",
          }}>
            What you&apos;re booking
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "#F2F6F3",
            lineHeight: 1.35, margin: "0 0 0.5rem",
          }}>
            {H.tagline}
          </p>
          <p style={{
            fontFamily: FONT, fontSize: "0.88rem", color: "rgba(242,246,243,0.65)",
            lineHeight: 1.6, margin: "0 0 1rem",
          }}>
            {H.locationBlurb} Real Superhost listing — same property on Airbnb and Abraxas.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "0.55rem",
            marginBottom: "1rem",
          }}>
            {CIELO_GUEST_ESSENTIALS.map(item => (
              <div key={item.label} style={{
                padding: "0.55rem 0.65rem", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{
                  fontFamily: FONT, fontSize: "0.65rem", fontWeight: 600,
                  color: "rgba(242,246,243,0.45)", textTransform: "uppercase",
                  letterSpacing: "0.04em", marginBottom: "0.2rem",
                }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "#F2F6F3", lineHeight: 1.35 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "0.85rem" }}>
            <div style={{
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
              color: "rgba(242,246,243,0.5)", marginBottom: "0.4rem",
            }}>
              Signature wellness
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {H.wellness.map(w => (
                <span key={w} style={{
                  padding: "0.3rem 0.55rem", borderRadius: 999,
                  background: `${ACCENT}14`, border: `1px solid ${ACCENT}33`,
                  fontFamily: FONT, fontSize: "0.72rem", color: "rgba(242,246,243,0.75)",
                }}>
                  {w}
                </span>
              ))}
            </div>
          </div>

          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "rgba(242,246,243,0.5)",
            lineHeight: 1.55, margin: "0 0 0.65rem",
          }}>
            {H.selfCheckIn} · {H.wifi} · {H.ev.split(",")[0]}
          </p>

          <div style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "rgba(242,246,243,0.45)",
            lineHeight: 1.5,
          }}>
            {Object.entries(H.driveTimes).map(([k, v]) => (
              <span key={k} style={{ marginRight: "0.75rem" }}>
                {k.replace(/([A-Z])/g, " $1").trim()} {v}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "1rem" }}>
            <Link href="/cielo/verified-rate" style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
            }}>
              Check verified rate →
            </Link>
            <Link href={FLAGSHIP_PROPERTY.airbnbUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: "rgba(242,246,243,0.55)", textDecoration: "none" }}>
              Compare on Airbnb →
            </Link>
          </div>
        </div>

        {/* Booking panel — date pickers + Apple Pay flow */}
        <div>
          <CieloBookingPanel suiAddress={suiAddress} variant="inline" />
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "rgba(242,246,243,0.4)",
            lineHeight: 1.55, margin: "0.65rem 0 0", textAlign: "center",
          }}>
            Pick dates above · pay with Apple Pay or USDC after confirmation ·{" "}
            <Link href="/cielo/status" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
              track your stay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function CieloFlagshipBookSection() {
  return (
    <SuiAuthProvider>
      <Inner />
    </SuiAuthProvider>
  );
}

/** @deprecated Use CieloFlagshipBookSection */
export function CieloFlagshipActions() {
  return <CieloFlagshipBookSection />;
}
