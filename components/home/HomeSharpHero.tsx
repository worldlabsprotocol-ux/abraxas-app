"use client";
// FILE: components/home/HomeSharpHero.tsx
// Outcome-first homepage — stop repeating verification.

import { Btn } from "@/components/redesign/ui";
import { HomePitchDeckMini } from "@/components/home/HomePitchDeckMini";
import { ABRAXAS_HEADLINE, ABRAXAS_SUBHEAD } from "@/lib/northStar";

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
            Reusable verification
          </div>
          <h1 id="home-hero-heading" style={{
            fontFamily: FONT, fontSize: "var(--fs-display)", fontWeight: 900,
            letterSpacing: "-0.045em", lineHeight: 0.98,
            color: "var(--text-primary)", margin: "0 0 1rem", maxWidth: 640,
          }}>
            {ABRAXAS_HEADLINE}
          </h1>
          <p style={{
            fontFamily: FONT, fontSize: "clamp(0.92rem, 2vw, 1.02rem)",
            color: "var(--text-primary)", lineHeight: 1.65,
            maxWidth: 560, margin: "0 0 0.65rem",
          }}>
            {ABRAXAS_SUBHEAD}
          </p>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.55, maxWidth: 520, margin: "0 0 1rem",
          }}>
            Stop uploading the same documents to every platform. Prove once — share only what they ask for.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1rem" }}>
            <Btn href="/passport" size="lg">Get verified once →</Btn>
            <Btn href="/#workflow" variant="secondary" size="lg">See the difference</Btn>
            <Btn href="/cielo/verified-rate" variant="ghost" size="lg">Try Cielo pilot →</Btn>
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
              Google sign-in creates your Passport. Connect your wallet when needed. Approve one partner request at a time.
              {" "}
              <a href="/#product-loop" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
                Watch the product loop
              </a>
              {" · "}
              <a href="/north-star" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
                North Star
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
