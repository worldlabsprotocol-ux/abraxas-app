"use client";
// FILE: components/redesign/NetworkHeroPanel.tsx
// Hero visual — verification network, not a mini registry.

import { motion } from "framer-motion";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const FLOW = [
  { role: "Issuer", detail: "Veriff · Abraxas · appraiser", status: "pilot" as const, color: "#3B82F6" },
  { role: "Holder", detail: "Passport · did:sui · consent", status: "live" as const, color: ACCENT },
  { role: "Verifier", detail: "Policy engine · /verify", status: "live" as const, color: "#F59E0B" },
];

export function NetworkHeroPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      style={{
        position: "relative", borderRadius: 20, overflow: "hidden",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--shadow-glow)", background: "var(--surface-raised)",
        padding: "1.25rem 1.35rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        <span style={{
          fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
          padding: "0.25rem 0.55rem", borderRadius: 999,
          background: "rgba(16,185,129,0.12)", color: ACCENT,
          border: "1px solid rgba(16,185,129,0.35)",
        }}>
          VERIFICATION NETWORK
        </span>
        <CapabilityStatusBadge status="live" size="xs" />
      </div>

      <div style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
        Issuer → Holder → Verifier
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
        lineHeight: 1.55, margin: "0 0 1rem", maxWidth: 380,
      }}>
        Signed credentials flow through consent. Partners get approve / deny / review — not document folders.
      </p>

      <div style={{ display: "grid", gap: "0.45rem", marginBottom: "1rem" }}>
        {FLOW.map((step, i) => (
          <div key={step.role} style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <span style={{
              fontFamily: MONO, fontSize: "0.52rem", fontWeight: 800, color: step.color,
              width: 14, flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <div style={{
              flex: 1, padding: "0.55rem 0.65rem", borderRadius: 10,
              background: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
            }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {step.role}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)" }}>{step.detail}</div>
              </div>
              <CapabilityStatusBadge status={step.status} size="xs" />
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "0.75rem 0.85rem", borderRadius: 12,
        background: "var(--surface)", border: "1px dashed var(--border-strong)",
        marginBottom: "0.85rem",
      }}>
        <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
          SAMPLE CREDENTIAL · W3C VC JWT
        </div>
        <code style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT, wordBreak: "break-all" }}>
          did:sui:…abx7f2 · identity:L2 · screening:clear
        </code>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Btn href="#test-network" size="sm">Test the network →</Btn>
        <Btn href="/passport" variant="tertiary" size="sm">Open Passport</Btn>
      </div>
    </motion.div>
  );
}
