"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Homepage demo — plain-language lead-in, generous spacing (not dev-console cramped).

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
        margin: "clamp(2.5rem, 6vw, 4rem) 0 clamp(3rem, 7vw, 4.5rem)",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: "clamp(1.25rem, 3vw, 1.75rem)", maxWidth: 720 }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.55rem" }}>
          How it works
        </div>
        <h2
          id="demo-heading"
          style={{
            fontFamily: DISPLAY,
            fontSize: "clamp(1.35rem, 4vw, 2rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.12,
            color: "var(--text-primary)",
            margin: "0 0 0.65rem",
          }}
        >
          Verify once. Use everywhere.
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "clamp(0.95rem, 2.4vw, 1.1rem)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: 0,
            maxWidth: 600,
          }}
        >
          {CINEMATIC_DEMO_LEAD} No crypto jargon required — this is the same verification loop banks, marketplaces, and property deals already run, just without repeating it seven times.
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
