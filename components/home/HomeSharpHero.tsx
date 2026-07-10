"use client";
// FILE: components/home/HomeSharpHero.tsx
// Three-action homepage opener — hero + optional story deck.

import { Btn } from "@/components/redesign/ui";
import { HomePitchDeckMini } from "@/components/home/HomePitchDeckMini";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeSharpHero() {
  return (
    <section id="top" aria-labelledby="home-hero-heading" style={{
      padding: "clamp(2.5rem, 6vw, 4rem) 0 clamp(1.5rem, 3vw, 2rem)",
    }}>
      <div className="home-hero-grid">
        <div>
          <div style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.65rem",
          }}>
            Abraxas
          </div>
          <h1 id="home-hero-heading" style={{
            fontFamily: FONT, fontSize: "var(--fs-display)", fontWeight: 900,
            letterSpacing: "-0.045em", lineHeight: 0.98,
            color: "var(--text-primary)", margin: "0 0 1rem", maxWidth: 640,
          }}>
            Real value lives off chain.
            <br />
            <span style={{ color: ACCENT }}>Proof has to bridge the gap.</span>
          </h1>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(0.92rem, 2vw, 1.02rem)",
            color: "var(--text-primary)", lineHeight: 1.65,
            maxWidth: 560, margin: "0 0 1rem",
          }}>
            Abraxas helps people prove what they control — and lets approved partners check only what they need.
          </p>
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
            lineHeight: 1.55, maxWidth: 520, margin: "0 0 1.25rem",
          }}>
            Pilot access for approved partners and verified use cases.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1rem" }}>
            <Btn href="/passport" size="lg">Create Passport →</Btn>
            <Btn href="/passport?view=verify" variant="secondary" size="lg">Verify a record →</Btn>
            <Btn href="/#registry" variant="ghost" size="lg">Explore registry →</Btn>
          </div>
          <details style={{ maxWidth: 520 }}>
            <summary style={{
              fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700,
              color: ACCENT, cursor: "pointer", listStyle: "none",
            }}>
              How it works →
            </summary>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
              lineHeight: 1.65, margin: "0.65rem 0 0",
            }}>
              Make your Passport. Connect your wallet. Verify more only when something actually needs it.
              {" "}
              <a href="/docs/why-verification" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
                Read the full explanation
              </a>
            </p>
          </details>
        </div>
        <HomePitchDeckMini />
      </div>

      <style>{`
        .home-hero-grid {
          display: grid;
          gap: clamp(1.5rem, 4vw, 2.5rem);
          align-items: start;
        }
        @media (min-width: 960px) {
          .home-hero-grid {
            grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
          }
        }
      `}</style>
    </section>
  );
}
