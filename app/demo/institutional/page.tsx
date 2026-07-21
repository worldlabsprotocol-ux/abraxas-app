"use client";

import { InstitutionalMasterSlideshow } from "@/components/home/institutional/InstitutionalMasterSlideshow";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";

export default function InstitutionalDemoPage() {
  return (
    <div data-theme="dark" className="abx-institutional-shell" style={{ minHeight: "100vh" }}>
      <AmbientGlow />
      <RedesignNav />
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem) 3rem",
        }}
      >
        <p
          style={{
            fontFamily: DEMO_TYPOGRAPHY.fontMono,
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: COSMIC_PALETTE.cyan,
            textAlign: "center",
            margin: "0 0 0.5rem",
          }}
        >
          Abraxas · Institutional deck
        </p>
        <h1
          style={{
            fontFamily: DEMO_TYPOGRAPHY.fontSans,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: COSMIC_PALETTE.textPrimary,
            textAlign: "center",
            margin: "0 0 1.5rem",
          }}
        >
          Market thesis → verify layer → live proof
        </h1>
        <InstitutionalMasterSlideshow fullScreen />
      </main>
    </div>
  );
}
