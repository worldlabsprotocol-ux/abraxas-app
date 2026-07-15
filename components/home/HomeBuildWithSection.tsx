"use client";
// FILE: components/home/HomeBuildWithSection.tsx
// Developer-first — can I integrate this next week?

import { Btn } from "@/components/redesign/ui";
import { BUILD_WITH_CAPABILITIES } from "@/lib/infrastructurePositioning";

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
          For Robinhood · Plume · Securitize · Figure · Ondo
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
          Embed trust into your application.
        </p>

        <ul
          style={{
            listStyle: "none",
            margin: "0 0 1.35rem",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: "0.5rem",
          }}
        >
          {BUILD_WITH_CAPABILITIES.map(item => (
            <li
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: FONT,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                padding: "0.55rem 0.7rem",
                borderRadius: 10,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ color: "#10B981", fontWeight: 800, fontSize: "0.9rem" }}>✓</span>
              {item}
            </li>
          ))}
        </ul>

        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            margin: "0 0 1rem",
            lineHeight: 1.55,
          }}
        >
          Integrate next week — live APIs, partner SDK patterns, and white-glove onboarding for approved builders.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
          <Btn href="/developers" size="lg">
            Read docs →
          </Btn>
          <Btn href="/design-partner" variant="secondary" size="lg">
            Book integration →
          </Btn>
          <Btn href="/tokenized-stocks" variant="ghost" size="lg">
            Tokenized stocks →
          </Btn>
        </div>
      </div>
    </section>
  );
}
