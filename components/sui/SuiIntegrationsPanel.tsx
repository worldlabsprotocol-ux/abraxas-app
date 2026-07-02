"use client";
// FILE: components/sui/SuiIntegrationsPanel.tsx
// Visual map of Sui verification features. fast discovery for users & operators.

import Link from "next/link";
import {
  SUI_FEATURES,
  SPONSORED_TX_TIERS,
  SPONSOR_TREASURY_MODEL,
  SETUP_CHECKLIST,
  SUI_VERIFICATION_TAGLINE,
} from "@/lib/protocolSui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";
const BLUE = "#3B82F6";

const STATUS_COLOR = { live: ACCENT, devnet: BLUE, roadmap: AMBER } as const;

export function SuiIntegrationsPanel({ showSetup = true }: { showSetup?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
        {SUI_VERIFICATION_TAGLINE}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
        {SUI_FEATURES.map(f => (
          <div key={f.id} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {f.title}
              </span>
              <span style={{
                fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", padding: "0.15rem 0.45rem", borderRadius: 999,
                color: STATUS_COLOR[f.status], border: `1px solid ${STATUS_COLOR[f.status]}55`,
                background: `${STATUS_COLOR[f.status]}14`,
              }}>
                {f.status}
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
              {f.summary}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {f.links.map(l => (
                <Link key={l.href} href={l.href}
                  target={"external" in l && l.external ? "_blank" : undefined}
                  rel={"external" in l && l.external ? "noopener noreferrer" : undefined}
                  style={{
                    fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600, color: ACCENT,
                    padding: "0.25rem 0.55rem", borderRadius: 999, border: "1px solid var(--border)",
                    textDecoration: "none",
                  }}>
                  {l.label} →
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div id="sponsored" style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "1.25rem",
      }}>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
          Sponsored transactions
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
          {SPONSOR_TREASURY_MODEL.summary}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "0.45rem", color: "var(--text-muted)" }}>Tier</th>
                <th style={{ padding: "0.45rem", color: "var(--text-muted)" }}>Stamps</th>
                <th style={{ padding: "0.45rem", color: "var(--text-muted)" }}>Sponsored / mo</th>
                <th style={{ padding: "0.45rem", color: "var(--text-muted)" }}>Includes</th>
              </tr>
            </thead>
            <tbody>
              {SPONSORED_TX_TIERS.map(row => (
                <tr key={row.tier} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.45rem", fontWeight: 700, color: ACCENT }}>{row.tier}</td>
                  <td style={{ padding: "0.45rem", fontFamily: MONO }}>{row.stamps}</td>
                  <td style={{ padding: "0.45rem", fontFamily: MONO }}>
                    {row.sponsoredActionsPerMonth < 0 ? "Unlimited" : row.sponsoredActionsPerMonth}
                  </td>
                  <td style={{ padding: "0.45rem", color: "var(--text-secondary)" }}>{row.includes.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.75rem 0 0", paddingLeft: "1.1rem" }}>
          {SPONSOR_TREASURY_MODEL.feeExamples.map(x => (
            <li key={x} style={{ marginBottom: "0.25rem" }}>{x}</li>
          ))}
        </ul>
      </div>

      {showSetup && (
        <div style={{
          background: `${ACCENT}0A`,
          border: `1px solid ${ACCENT}33`,
          borderRadius: 12,
          padding: "1rem",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Operator checklist (pick up where you left off)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {SETUP_CHECKLIST.map(s => (
              <Link key={s.step} href={s.href} style={{ textDecoration: "none", display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                <span style={{ fontFamily: MONO, fontSize: "0.65rem", color: ACCENT, fontWeight: 700 }}>{s.step}.</span>
                <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>{s.label}</span>
                <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>- done when: {s.doneWhen}</span>
              </Link>
            ))}
          </div>
          <Link href="/docs/sui" style={{ display: "inline-block", marginTop: "0.75rem", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>
            Full Sui integration hub →
          </Link>
        </div>
      )}
    </div>
  );
}
