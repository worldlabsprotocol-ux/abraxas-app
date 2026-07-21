"use client";

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { InstitutionalMasterSlideshow } from "@/components/home/institutional/InstitutionalMasterSlideshow";
import { RWA_THESIS_MEDIUM_URL } from "@/lib/rwaTokenizationThesis";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeInstitutionalShowcase() {
  return (
    <section
      id="institutional-story"
      aria-labelledby="institutional-story-heading"
      style={{
        padding: "clamp(1.5rem, 4vw, 2.5rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Institutional story · one deck
        </div>
        <h2
          id="institutional-story-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            margin: "0 0 0.5rem",
            lineHeight: 1.15,
          }}
        >
          Market thesis → verify layer → live proof
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: 560,
            margin: "0 auto 0.75rem",
          }}
        >
          One slideshow for investors, institutions, builders, and agents. Medium RWA essay as the market
          diagram — visuals at every level, not just numbers.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
          <Btn href={RWA_THESIS_MEDIUM_URL} variant="secondary" size="sm">
            Medium essay →
          </Btn>
          <Link
            href="/demo/institutional"
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              fontWeight: 700,
              color: "var(--accent)",
              textDecoration: "none",
              letterSpacing: "0.06em",
            }}
          >
            Full-screen deck →
          </Link>
        </div>
      </div>

      <InstitutionalMasterSlideshow />
    </section>
  );
}
