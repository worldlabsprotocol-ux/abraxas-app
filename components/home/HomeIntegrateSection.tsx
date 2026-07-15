"use client";
// FILE: components/home/HomeIntegrateSection.tsx
// Builder CTA — embed Passport, don't tokenize with Abraxas.

import { Btn } from "@/components/redesign/ui";
import {
  ABRAXAS_EMBED_PITCH,
  INTEGRATE_CAPABILITIES,
  BUILD_FOR_AUDIENCES,
} from "@/lib/infrastructurePositioning";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeIntegrateSection() {
  return (
    <section
      id="integrate"
      aria-labelledby="integrate-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div
        className="abx-glass-panel"
        style={{
          padding: "clamp(1.1rem, 3vw, 1.5rem)",
          borderRadius: 18,
          border: "1px solid rgba(232,197,71,0.28)",
          background: "linear-gradient(155deg, rgba(232,197,71,0.06) 0%, var(--surface-raised) 55%)",
        }}
      >
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          For RWA builders
        </div>
        <h2
          id="integrate-heading"
          style={{
            fontFamily: FONT,
            fontSize: "var(--fs-h2)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "var(--text-primary)",
            margin: "0 0 0.65rem",
            maxWidth: 560,
          }}
        >
          Building tokenized assets?{" "}
          <span className="abx-gradient-text">Integrate Abraxas.</span>
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.84rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 1rem",
            maxWidth: 640,
          }}
        >
          {ABRAXAS_EMBED_PITCH}
        </p>

        <ul
          style={{
            listStyle: "none",
            margin: "0 0 1.1rem",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: "0.45rem",
          }}
        >
          {INTEGRATE_CAPABILITIES.map(item => (
            <li
              key={item}
              style={{
                fontFamily: FONT,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                padding: "0.45rem 0.65rem",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <span style={{ color: "var(--accent)", marginRight: "0.35rem" }}>•</span>
              {item}
            </li>
          ))}
        </ul>

        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.52rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "0.45rem",
          }}
        >
          Built for
        </div>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 1rem",
            maxWidth: 640,
          }}
        >
          {BUILD_FOR_AUDIENCES.join(" · ")}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
          <Btn href="/integrate" size="lg">
            Build with Abraxas →
          </Btn>
          <Btn href="/design-partner" variant="secondary" size="lg">
            Talk to us →
          </Btn>
          <Btn href="/developers" variant="ghost" size="lg">
            API & docs →
          </Btn>
        </div>
      </div>
    </section>
  );
}
