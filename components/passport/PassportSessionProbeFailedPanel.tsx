"use client";
// FILE: components/passport/PassportSessionProbeFailedPanel.tsx
// Recoverable state when browser-session probe fails for network/service reasons.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";

const FONT = ABRAXAS_FONT_SANS;

export function PassportSessionProbeFailedPanel({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <section
      aria-labelledby="passport-session-probe-heading"
      style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: PUBLIC_SURFACE.cardBorder,
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}
    >
      <h2
        id="passport-session-probe-heading"
        style={{
          fontFamily: FONT,
          fontSize: "0.95rem",
          fontWeight: 800,
          margin: "0 0 0.5rem",
        }}
      >
        Secure session check failed
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.84rem",
        lineHeight: 1.6,
        color: "var(--text-secondary)",
        margin: "0 0 1rem",
      }}>
        We could not confirm your secure browser session. Check your connection and try again.
      </p>
      <Btn size="lg" fullWidth variant="secondary" onClick={onRetry}>
        Try again
      </Btn>
    </section>
  );
}
