"use client";
// FILE: components/home/HomeProductionStatusStrip.tsx

import Link from "next/link";
import {
  PRODUCTION_STATUS_LEAD,
  PRODUCTION_STATUS_GATES,
  CURRENT_STATUS_LIVE,
} from "@/lib/currentStatus";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeProductionStatusStrip() {
  return (
    <section id="production-status" aria-label="Production status" style={{ padding: "0 0 clamp(0.75rem, 2vw, 1.25rem)" }}>
      <div style={{
        padding: "clamp(1rem, 2.5vw, 1.2rem) clamp(1rem, 3vw, 1.35rem)",
        borderRadius: 16,
        border: "1px solid rgba(16,185,129,0.28)",
        background: "linear-gradient(155deg, rgba(16,185,129,0.09) 0%, var(--surface-raised) 100%)",
        boxShadow: "var(--shadow-card)",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.65rem" }}>
          <span style={{
            fontFamily: MONO, fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.1em",
            color: ACCENT, padding: "0.2rem 0.55rem", borderRadius: 999,
            border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.1)",
          }}>
            LIVE IN PRODUCTION
          </span>
          {CURRENT_STATUS_LIVE.map(item => (
            <span key={item.id} style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              ✓ {item.label}
            </span>
          ))}
        </div>

        <p style={{ fontFamily: FONT, fontSize: "clamp(0.84rem, 2vw, 0.92rem)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.55, margin: "0 0 0.45rem", maxWidth: 700 }}>
          {PRODUCTION_STATUS_LEAD}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem", maxWidth: 700 }}>
          {PRODUCTION_STATUS_GATES}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem 0.85rem" }}>
          <Link href="/trust-framework#trust-over-time" style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
            See how verification and refresh actually work →
          </Link>
          <Link href="/integrate" style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", textDecoration: "none" }}>
            Integrate Abraxas →
          </Link>
          <Link href="/roadmap" style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", textDecoration: "none" }}>
            Final mainnet gates →
          </Link>
        </div>
      </div>
    </section>
  );
}
