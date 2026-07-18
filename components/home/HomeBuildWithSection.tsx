"use client";
// FILE: components/home/HomeBuildWithSection.tsx
// Developer-first — bridge from product story to integration.

import { Btn } from "@/components/redesign/ui";
import { BUILD_WITH_OUTCOMES, HOME_BUILD_BRIDGE } from "@/lib/infrastructurePositioning";
import { BUILDER_PROOF_EXAMPLES } from "@/lib/positioningStrategy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeBuildWithSection() {
  return (
    <section
      id="build"
      aria-labelledby="build-heading"
      style={{
        padding: "clamp(1.5rem, 4vw, 2.25rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.88rem",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          margin: "0 0 1.15rem",
          maxWidth: 640,
        }}
      >
        {HOME_BUILD_BRIDGE}
      </p>

      <div
        style={{
          padding: "clamp(1.25rem, 3vw, 1.75rem)",
          borderRadius: 20,
          border: "1px solid rgba(232,197,71,0.32)",
          background: "linear-gradient(160deg, rgba(232,197,71,0.1) 0%, rgba(10,8,20,0.6) 45%, var(--surface-raised) 100%)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "0.5rem",
          }}
        >
          Live proof · Cielo · land deals · registry
        </div>

        <h2
          id="build-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.5rem, 4vw, var(--fs-h1))",
            fontWeight: 900,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            color: "var(--text-primary)",
            margin: "0 0 0.35rem",
          }}
        >
          Build with Abraxas
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
            fontWeight: 600,
            color: "var(--text-secondary)",
            margin: "0 0 1.15rem",
            lineHeight: 1.4,
            maxWidth: 520,
          }}
        >
          Embed Passport into your application.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "0.5rem",
          marginBottom: "1.15rem",
        }}>
          {BUILDER_PROOF_EXAMPLES.map(ex => (
            <a
              key={ex.name}
              href={ex.href}
              style={{
                display: "block",
                padding: "0.65rem 0.75rem",
                borderRadius: 10,
                border: "1px solid rgba(16,185,129,0.28)",
                background: "rgba(16,185,129,0.06)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {ex.name} →
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                {ex.outcome}
              </div>
            </a>
          ))}
        </div>

        <ul
          style={{
            listStyle: "none",
            margin: "0 0 1.35rem",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "0.5rem",
          }}
        >
          {BUILD_WITH_OUTCOMES.map(item => (
            <li
              key={item.label}
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: 10,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: "0.85rem", lineHeight: 1.4 }}>✓</span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>
                    {item.outcome}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
          <Btn href="/developers" size="lg">
            Read docs →
          </Btn>
          <Btn href="/design-partner" variant="secondary" size="lg">
            Book integration →
          </Btn>
          <Btn href="/passport" variant="ghost" size="lg">
            Launch app →
          </Btn>
        </div>
      </div>
    </section>
  );
}
