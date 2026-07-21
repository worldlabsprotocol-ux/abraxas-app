"use client";
// FILE: components/home/HomeSharpHero.tsx
// Three-layer hierarchy — emotion · mechanism · category (10-second read).

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { AGENTIC_FINANCE_HERO_PILL } from "@/lib/agenticFinancePositioning";
import { RWA_THESIS_HERO_PILL } from "@/lib/rwaTokenizationThesis";
import {
  ABRAXAS_CATEGORY,
  ABRAXAS_EMOTION_HEADLINE,
  ABRAXAS_MECHANISM,
  ABRAXAS_HEADLINE,
  ABRAXAS_SUBHEAD,
} from "@/lib/northStar";

import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_MONO,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const TEXT_COL: React.CSSProperties = { maxWidth: 780 };

export function HomeSharpHero() {
  const [tagLead, tagTail] = ABRAXAS_HEADLINE.split(". ").map(s => s.replace(/\.$/, ""));

  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      style={{
        padding: "clamp(2rem, 5vw, 3.5rem) 0 clamp(1.25rem, 3vw, 1.75rem)",
      }}
    >
      <div style={TEXT_COL}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.85rem" }}>
          <Link
            href="/#article"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.75rem",
              borderRadius: 999,
              border: "1px solid rgba(232,197,71,0.45)",
              background: "rgba(232,197,71,0.1)",
              textDecoration: "none",
              maxWidth: "100%",
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: ABRAXAS_FONT_MONO,
                fontSize: "0.52rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#E8C547",
                flexShrink: 0,
              }}
            >
              Article
            </span>
            <span
              style={{
                fontFamily: FONT,
                fontSize: "clamp(0.72rem, 1.8vw, 0.82rem)",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.35,
              }}
            >
              {RWA_THESIS_HERO_PILL} →
            </span>
          </Link>
          <Link
            href="/#institutional-story"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.75rem",
              borderRadius: 999,
              border: "1px solid rgba(16,185,129,0.45)",
              background: "rgba(16,185,129,0.1)",
              textDecoration: "none",
              maxWidth: "100%",
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: ABRAXAS_FONT_MONO,
                fontSize: "0.52rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#34D399",
                flexShrink: 0,
              }}
            >
              New
            </span>
            <span
              style={{
                fontFamily: FONT,
                fontSize: "clamp(0.72rem, 1.8vw, 0.82rem)",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.35,
              }}
            >
              {AGENTIC_FINANCE_HERO_PILL} →
            </span>
          </Link>
        </div>

        <h1
          id="home-hero-heading"
          style={{
            fontFamily: ABRAXAS_FONT_DISPLAY,
            fontSize: "clamp(2rem, 5.5vw, var(--fs-display))",
            fontWeight: 800,
            letterSpacing: "-0.045em",
            lineHeight: 1.02,
            color: "var(--text-primary)",
            margin: "0 0 0.55rem",
          }}
        >
          {ABRAXAS_EMOTION_HEADLINE}
        </h1>
      </div>

      <div style={TEXT_COL}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.05rem, 2.8vw, 1.35rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-secondary)",
            margin: "0 0 0.65rem",
            lineHeight: 1.25,
          }}
        >
          {ABRAXAS_MECHANISM}
        </p>

        <p
          style={{
            fontFamily: FONT,
            fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "0 0 0.5rem",
            lineHeight: 1.2,
          }}
        >
          <span style={{ color: "var(--text-primary)" }}>{tagLead}. </span>
          <span className="abx-gradient-text">{tagTail}.</span>
        </p>

        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.85rem" }}>
          {ABRAXAS_CATEGORY}
        </div>

        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.86rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 1.15rem",
            maxWidth: 640,
          }}
        >
          {ABRAXAS_SUBHEAD}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.5rem" }}>
          <Btn href="/#minimum-proof" size="lg">
            Minimum proof →
          </Btn>
          <Btn href="/#mainnet-readiness" variant="secondary" size="lg">
            Mainnet gates →
          </Btn>
          <Btn href="/integrate" variant="secondary" size="lg">
            Build with Abraxas →
          </Btn>
          <Btn href="/developers" variant="ghost" size="lg">
            Read docs →
          </Btn>
        </div>
      </div>
    </section>
  );
}
