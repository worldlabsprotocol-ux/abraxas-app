"use client";
// FILE: components/redesign/AssetVerificationScopePanel.tsx

import { CIELO_VERIFICATION_SCOPE } from "@/lib/data/cieloVerificationScope";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { AssuranceLegend } from "./AssuranceLegend";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function AssetVerificationScopePanel({ id = "verification-scope" }: { id?: string }) {
  const s = CIELO_VERIFICATION_SCOPE;

  return (
    <section id={id} style={{
      padding: "1.25rem 1.35rem", borderRadius: 18,
      background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
      marginTop: "1.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
          Verification scope · {s.assetName}
        </h3>
        <CapabilityStatusBadge status={s.status} size="xs" />
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "#F59E0B",
        lineHeight: 1.55, margin: "0 0 0.85rem", padding: "0.55rem 0.65rem",
        borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
      }}>
        {s.offeringNote}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.85rem" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
            Verified scope
          </div>
          <ul style={{ margin: 0, paddingLeft: "1rem" }}>
            {s.scope.map(item => (
              <li key={item} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 4 }}>
                {item}
              </li>
            ))}
          </ul>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", marginTop: "0.65rem" }}>
            Last reviewed {s.lastReviewed} · ID {s.assetId}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
            Issuer(s)
          </div>
          {s.issuers.map(i => (
            <div key={i.role} style={{ marginBottom: "0.45rem" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {i.role}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
                {i.name} · {i.assurance}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
            Not verified
          </div>
          <ul style={{ margin: 0, paddingLeft: "1rem" }}>
            {s.notVerified.map(item => (
              <li key={item} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 4 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: "0.85rem" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
          Figures on registry card
        </div>
        <div style={{ display: "grid", gap: "0.35rem" }}>
          {s.claims.map(c => (
            <div key={c.label} style={{
              display: "grid", gridTemplateColumns: "1fr auto auto auto",
              gap: "0.5rem", fontFamily: FONT, fontSize: "0.68rem", alignItems: "center",
              padding: "0.35rem 0.5rem", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{c.label}</span>
              <span style={{ color: "var(--text-secondary)" }}>{c.value}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: "#10B981" }}>L{c.level}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)" }}>{c.type} · {c.asOf}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "0.85rem" }}>
        <AssuranceLegend compact />
      </div>
    </section>
  );
}
