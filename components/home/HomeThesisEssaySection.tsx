"use client";
// FILE: components/home/HomeThesisEssaySection.tsx
// RWA thesis — compact slideshow (full essay, minimal homepage height).

import { ThesisEssaySlideshow } from "@/components/home/ThesisEssaySlideshow";
import {
  RWA_THESIS_HOME_LEAD,
  RWA_THESIS_SUBTITLE,
  RWA_THESIS_TITLE,
} from "@/lib/rwaTokenizationThesis";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeThesisEssaySection() {
  return (
    <section
      id="thesis"
      aria-labelledby="thesis-heading"
      style={{
        padding: "clamp(1rem, 2.5vw, 1.5rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div style={{ marginBottom: "0.75rem" }}>
        <p
          style={{
            fontFamily: MONO,
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            margin: "0 0 0.4rem",
          }}
        >
          Vision & thesis · Medium · July 2026
        </p>
        <h2
          id="thesis-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.05rem, 2.8vw, 1.35rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: "0 0 0.35rem",
            lineHeight: 1.2,
          }}
        >
          {RWA_THESIS_TITLE}
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--accent-pale, var(--accent))",
            margin: "0 0 0.35rem",
            lineHeight: 1.4,
          }}
        >
          {RWA_THESIS_SUBTITLE}
        </p>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.55,
            maxWidth: 560,
          }}
        >
          {RWA_THESIS_HOME_LEAD}
        </p>
      </div>

      <ThesisEssaySlideshow />
    </section>
  );
}
