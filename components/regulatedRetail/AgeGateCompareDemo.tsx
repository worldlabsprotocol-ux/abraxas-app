"use client";
// FILE: components/regulatedRetail/AgeGateCompareDemo.tsx
// Side-by-side: traditional age popup vs Abraxas verify-once eligibility.

import { useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  REGULATED_RETAIL_VERTICALS,
  type RegulatedRetailVerticalId,
} from "@/lib/regulatedRetail/vertical";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

export function AgeGateCompareDemo() {
  const [verticalId, setVerticalId] = useState<RegulatedRetailVerticalId>("cannabis_adult_use");
  const vertical = REGULATED_RETAIL_VERTICALS.find(v => v.id === verticalId) ?? REGULATED_RETAIL_VERTICALS[0];
  const [popupAccepted, setPopupAccepted] = useState(false);
  const [abraxasVerified, setAbraxasVerified] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {REGULATED_RETAIL_VERTICALS.map(v => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              setVerticalId(v.id);
              setPopupAccepted(false);
              setAbraxasVerified(false);
            }}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: 999,
              border: `1px solid ${verticalId === v.id ? ACCENT : "var(--border)"}`,
              background: verticalId === v.id ? `${ACCENT}12` : "var(--surface)",
              color: verticalId === v.id ? ACCENT : "var(--text-secondary)",
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div
        className="age-gate-compare-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: "0.85rem",
          alignItems: "stretch",
        }}
      >
        <Panel label="Today · every visit" accent={AMBER}>
          <div
            style={{
              minHeight: 220,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "1.25rem 1rem",
              borderRadius: 12,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            {!popupAccepted ? (
              <>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.14em", color: AMBER, marginBottom: 8 }}>
                  {vertical.gateCopy.eyebrow}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "clamp(1rem, 3vw, 1.35rem)", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: 10 }}>
                  {vertical.gateCopy.headline}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16 }}>
                  {vertical.gateCopy.requirement}
                </div>
                <button
                  type="button"
                  onClick={() => setPopupAccepted(true)}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: 999,
                    border: "none",
                    background: AMBER,
                    color: "#1a1200",
                    fontFamily: FONT,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  I am {vertical.minimumAge}+
                </button>
                <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: "12px 0 0", maxWidth: 220, lineHeight: 1.5 }}>
                  No durable proof. Same gate tomorrow. No audit trail for compliance.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>✓</div>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>You entered.</div>
                <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "8px 0 12px", lineHeight: 1.5 }}>
                  Refresh the page — you will see the popup again. That is the repeated verification tax.
                </p>
                <button
                  type="button"
                  onClick={() => setPopupAccepted(false)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    fontFamily: FONT,
                    fontSize: "0.68rem",
                    cursor: "pointer",
                  }}
                >
                  Simulate next visit →
                </button>
              </>
            )}
          </div>
          {vertical.partnerExample && (
            <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: "0.65rem 0 0", lineHeight: 1.5 }}>
              Example gate pattern from partner{" "}
              <Link href={vertical.partnerExample.href} style={{ color: ACCENT, textDecoration: "none" }}>
                {vertical.partnerExample.name}
              </Link>
              {" "}· {vertical.partnerExample.location}
              {vertical.partnerExample.established ? ` · Est. ${vertical.partnerExample.established}` : ""}
            </p>
          )}
        </Panel>

        <Panel label="Abraxas · verify once" accent={ACCENT}>
          <div
            style={{
              minHeight: 220,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "1.25rem 1rem",
              borderRadius: 12,
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.28)",
            }}
          >
            {!abraxasVerified ? (
              <>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.12em", color: ACCENT, marginBottom: 8 }}>
                  PASSPORT · ONE-TIME
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                  Prove {vertical.minimumAge}+ once
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 14px", maxWidth: 260, lineHeight: 1.55 }}>
                  Identity + liveness on /passport. Retailers call verify with policy{" "}
                  <code style={{ fontFamily: MONO, fontSize: "0.62rem" }}>{vertical.policyId}</code> — outcome only, no ID images.
                </p>
                <Btn href="/passport" size="sm">
                  Get verified →
                </Btn>
                <button
                  type="button"
                  onClick={() => setAbraxasVerified(true)}
                  style={{
                    marginTop: 10,
                    padding: 0,
                    border: "none",
                    background: "none",
                    color: "var(--text-muted)",
                    fontFamily: FONT,
                    fontSize: "0.65rem",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Simulate already verified
                </button>
              </>
            ) : (
              <>
                <div style={{
                  width: "100%", maxWidth: 280, padding: "0.75rem", borderRadius: 10,
                  border: `1px solid ${ACCENT}44`, background: "rgba(0,0,0,0.25)", textAlign: "left",
                }}>
                  <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: ACCENT, marginBottom: 6 }}>POST /api/credentials/verify</div>
                  <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    decision: <span style={{ color: ACCENT }}>approved</span><br />
                    claims: {vertical.claimsSummary}<br />
                    proof_id: aprx_retail_…
                  </div>
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "10px 0 0", lineHeight: 1.5 }}>
                  Re-checked every checkout. User does not re-upload their license on every site.
                </p>
              </>
            )}
          </div>
        </Panel>
      </div>

      <style jsx>{`
        @media (max-width: 560px) {
          .age-gate-compare-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function Panel({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: "0.85rem",
      borderRadius: 14,
      border: "1px solid var(--border-strong)",
      background: "var(--surface-raised)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.1em",
        color: accent, marginBottom: "0.65rem", textTransform: "uppercase",
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
