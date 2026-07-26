"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Homepage demo — plain-language lead-in, responsive on mobile.

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
        margin: "clamp(1.5rem, 4vw, 4rem) 0 clamp(2rem, 5vw, 4.5rem)",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ marginBottom: "clamp(0.85rem, 2.5vw, 1.75rem)", maxWidth: 720 }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          How it works
        </div>
        <h2
          id="demo-heading"
          style={{
            fontFamily: DISPLAY,
            fontSize: "clamp(1.2rem, 3.6vw, 2rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.12,
            color: "var(--text-primary)",
            margin: "0 0 0.5rem",
          }}
        >
          Verify once. Use everywhere.
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "clamp(0.84rem, 2.2vw, 1.1rem)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
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
        @media (max-width: 767px) {
          .hero-demo-breakout {
            margin-left: 0;
            margin-right: 0;
          }
        }
      `}</style>
    </section>
  );
}
