"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Homepage demo — cinematic 7× verification debt (hero typography).

import { HomeCinematicDemo } from "./HomeCinematicDemo";
import { CINEMATIC_DEMO_LEAD } from "@/lib/intersectionThesis";
import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;

export function HomeDemoVideo() {
  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="hero-demo-breakout"
      style={{
        margin: "clamp(1.25rem, 3vw, 2rem) 0 clamp(1.75rem, 4vw, 2.5rem)",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: "clamp(0.85rem, 2vw, 1.25rem)", maxWidth: 780 }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          The problem
        </div>
        <h2
          id="demo-heading"
          style={{
            fontFamily: DISPLAY,
            fontSize: "clamp(1.35rem, 4vw, 2rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.08,
            color: "var(--text-primary)",
            margin: "0 0 0.55rem",
          }}
        >
          You verify <span style={{ color: "var(--accent)" }}>7×</span>. You should verify once.
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "clamp(0.95rem, 2.4vw, 1.15rem)",
            fontWeight: 600,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 640,
          }}
        >
          {CINEMATIC_DEMO_LEAD}
        </p>
      </div>
      <HomeCinematicDemo hero />
      <style jsx>{`
        @media (min-width: 900px) {
          .hero-demo-breakout {
            width: min(1120px, calc(100% + 4rem));
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
    </section>
  );
}
