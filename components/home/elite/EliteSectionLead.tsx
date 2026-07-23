"use client";

import type { ReactNode } from "react";
import { DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import { ABRAXAS_FONT_DISPLAY } from "@/lib/abraxasTypography";

/** Minimal section lead. eyebrow + short title only. */
export function EliteSectionLead({
  eyebrow,
  title,
  headingId,
  center = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  headingId?: string;
  center?: boolean;
}) {
  return (
    <div style={{ marginBottom: "0.75rem", textAlign: center ? "center" : undefined }}>
      {eyebrow && (
        <p
          style={{
            fontFamily: DEMO_TYPOGRAPHY.fontMono,
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--cosmic-cyan, var(--accent-2))",
            margin: "0 0 0.35rem",
            textShadow: "0 0 24px rgba(34, 211, 238, 0.25)",
          }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        id={headingId}
        style={{
          fontFamily: ABRAXAS_FONT_DISPLAY,
          fontSize: "clamp(1.15rem, 2.8vw, 1.45rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}
