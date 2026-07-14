"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Protocol demo — primary explainer on homepage (video does the heavy lifting).

import { Btn } from "@/components/redesign/ui";
import { DEMO_VIDEO } from "@/lib/marketing/demoVideo";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomeDemoVideo() {
  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      style={{
        padding: "clamp(0.5rem, 2vw, 1rem) 0 clamp(1.25rem, 3vw, 2rem)",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        See it work
      </div>
      <h2
        id="demo-heading"
        style={{
          fontFamily: FONT,
          fontSize: "var(--fs-h2)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          margin: "0 0 0.75rem",
          maxWidth: 520,
        }}
      >
        {DEMO_VIDEO.title}
      </h2>

      <div
        className="abx-glass-panel"
        style={{
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid var(--border-strong)",
          background: "#06090B",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <video
          controls
          playsInline
          preload="metadata"
          poster={DEMO_VIDEO.poster}
          aria-label="Abraxas protocol demo: verify once, reuse trust across real assets"
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#06090B",
          }}
        >
          <source src={DEMO_VIDEO.src} type="video/mp4" />
        </video>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.55rem",
          marginTop: "0.85rem",
          alignItems: "center",
        }}
      >
        <Btn href="/passport" size="sm">Create Passport →</Btn>
        <Btn href="/#registry" variant="secondary" size="sm">Browse assets →</Btn>
        <span
          style={{
            fontFamily: FONT,
            fontSize: "0.72rem",
            color: "var(--text-muted)",
          }}
        >
          {DEMO_VIDEO.durationSec}s · land partner onboarding to closed-loop settlement
        </span>
      </div>
    </section>
  );
}
