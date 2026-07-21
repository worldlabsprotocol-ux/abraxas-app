"use client";

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { InstitutionalMasterSlideshow } from "@/components/home/institutional/InstitutionalMasterSlideshow";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeInstitutionalShowcase() {
  return (
    <section
      id="institutional-story"
      aria-labelledby="institutional-story-heading"
      className="abx-home-section"
      style={{
        paddingBottom: "clamp(2.5rem, 6vw, 4rem)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "clamp(1.5rem, 4vw, 2.25rem)" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Product proof deck
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
          See the product — not the thesis again
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: 520,
            margin: "0 auto 0.75rem",
          }}
        >
          Passport, unlock, signed receipts, and stack position. Market stats, tokenization steps, and live
          asset references are in the article below — shown once.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
          <Btn href="/#article" variant="secondary" size="sm">
            Read article →
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
