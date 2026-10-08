"use client";
// FILE: components/passport/PassportSignInErrorBanner.tsx
// Simple customer-facing sign-in error with retry — no legacy recovery branching.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function PassportSignInErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      aria-live="polite"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.35)",
        borderRadius: 14,
        padding: "1rem 1.1rem",
        marginBottom: "1rem",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.84rem",
        lineHeight: 1.55,
        color: "#EF4444",
        margin: "0 0 0.75rem",
      }}>
        {message}
      </p>
      <Btn size="sm" variant="secondary" onClick={onRetry}>
        Try again
      </Btn>
    </section>
  );
}
