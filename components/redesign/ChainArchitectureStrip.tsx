"use client";
// FILE: components/redesign/ChainArchitectureStrip.tsx

import { HOMEPAGE_THESIS } from "@/lib/capabilityStatus";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const STACK = [
  { label: "Identity creation", detail: "Sui zkLogin · did:sui", status: "live" as const },
  { label: "Optional IDV", detail: "Veriff · claims not documents", status: "pilot" as const },
  { label: "Credentials", detail: "W3C VC as Ed25519 JWT", status: "live" as const },
  { label: "Status anchor", detail: "Sui credential object (when provisioned)", status: "pilot" as const },
  { label: "Settlement", detail: "USDC on Sui · MoonPay fiat (pilot)", status: "pilot" as const },
  { label: "Partner decisions", detail: "Policy engine v1 API", status: "live" as const },
];

export function ChainArchitectureStrip() {
  return (
    <section style={{
      padding: "1rem 1.15rem", borderRadius: 16,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--text-muted)", marginBottom: "0.45rem",
      }}>
        Architecture · Sui-first
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
        lineHeight: 1.6, margin: "0 0 0.75rem", maxWidth: 720,
      }}>
        {HOMEPAGE_THESIS.chainStory}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.45rem" }}>
        {STACK.map(item => (
          <div key={item.label} style={{
            padding: "0.5rem 0.65rem", borderRadius: 10,
            background: "var(--surface-raised)", border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: 2 }}>
              <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {item.label}
              </span>
              <CapabilityStatusBadge status={item.status} size="xs" />
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)" }}>{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
