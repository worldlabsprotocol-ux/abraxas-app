"use client";
// FILE: components/home/HomeVerifyOnceDiagram.tsx
// Without Abraxas vs With Abraxas — regulated industries, not generic placeholders.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  WITHOUT_ABRAXAS_INDUSTRIES,
  WITH_ABRAXAS_INDUSTRIES,
  type IndustryCard,
} from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

function IndustryProblemCard({ item }: { item: IndustryCard }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.55rem",
        padding: "0.65rem 0.75rem",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <span style={{ fontSize: "1rem", lineHeight: 1 }} aria-hidden>{item.icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)" }}>
          {item.title}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>
          {item.problem}
        </div>
      </div>
    </div>
  );
}

function IndustrySolutionCard({ item }: { item: IndustryCard }) {
  return (
    <div
      style={{
        flex: "1 1 120px",
        maxWidth: 150,
        padding: "0.55rem 0.5rem",
        borderRadius: 10,
        border: `1px solid ${ACCENT}44`,
        background: `${ACCENT}10`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1rem", marginBottom: 4 }} aria-hidden>{item.icon}</div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-primary)" }}>
        {item.title}
      </div>
    </div>
  );
}

export function HomeVerifyOnceDiagram() {
  return (
    <section aria-labelledby="home-verify-once-heading">
      <h2
        id="home-verify-once-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 1rem",
        }}
      >
        One verification, many regulated ecosystems
      </h2>
      <div className="verify-once-diagram" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
        <Panel title="Without Abraxas" muted>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {WITHOUT_ABRAXAS_INDUSTRIES.map((item) => (
              <IndustryProblemCard key={item.id} item={item} />
            ))}
          </div>
        </Panel>

        <div aria-hidden style={{ display: "flex", justifyContent: "center", color: ACCENT, fontFamily: MONO, fontSize: "1.25rem", fontWeight: 700 }}>
          ↓
        </div>

        <Panel title="With Abraxas">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <CredentialNode>Verify Once</CredentialNode>
            <div aria-hidden style={{ color: ACCENT, fontFamily: MONO, fontSize: "1.1rem", fontWeight: 700, padding: "0.35rem 0" }}>↓</div>
            <CredentialNode highlight>Reusable Identity Credential</CredentialNode>
            <div aria-hidden style={{
              fontFamily: MONO, fontSize: "0.8rem", fontWeight: 700,
              color: ACCENT, padding: "0.35rem 0", textAlign: "center",
            }}>
              ┌──────┼──────┐
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.45rem", width: "100%" }}>
              {WITH_ABRAXAS_INDUSTRIES.map((item) => (
                <IndustrySolutionCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <style jsx>{`
        @media (min-width: 900px) {
          .verify-once-diagram {
            grid-template-columns: 1fr auto 1fr;
            align-items: stretch;
          }
          .verify-once-diagram > :nth-child(2) {
            align-self: center;
            transform: rotate(-90deg);
          }
        }
      `}</style>
    </section>
  );
}

function Panel({ title, muted, children }: { title: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "clamp(1rem, 3vw, 1.35rem)",
        borderRadius: 14,
        background: muted ? "var(--surface-raised)" : `linear-gradient(135deg, ${ACCENT}12 0%, rgba(167,139,250,0.06) 100%)`,
        border: muted ? "1px solid var(--border-strong)" : `1px solid ${ACCENT}33`,
      }}
    >
      <div style={{
        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: muted ? "var(--text-muted)" : ACCENT, marginBottom: "0.75rem",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function CredentialNode({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: highlight ? "0.82rem" : "0.78rem", fontWeight: 800,
      padding: "0.5rem 0.85rem", borderRadius: 10, textAlign: "center",
      border: `1px solid ${ACCENT}55`, background: `${ACCENT}14`,
      color: "var(--text-primary)", maxWidth: 280, width: "100%",
    }}>
      {children}
    </div>
  );
}
