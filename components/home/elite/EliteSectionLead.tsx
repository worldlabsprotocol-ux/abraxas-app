"use client";

import type { ReactNode } from "react";
import { DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";

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
          fontFamily: DEMO_TYPOGRAPHY.fontSans,
          fontSize: "clamp(1.05rem, 2.6vw, 1.35rem)",
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
