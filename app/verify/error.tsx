"use client";
// FILE: app/verify/error.tsx
// Recoverable error boundary for the public verifier experience.

import { useEffect } from "react";
import Link from "next/link";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export default function VerifyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[verify]", error);
  }, [error]);

  return (
    <RedesignShell>
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "clamp(2.5rem, 8vw, 4rem) clamp(1rem, 4vw, 2rem)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--accent)",
            marginBottom: "0.65rem",
          }}
        >
          VERIFY
        </div>
        <h1
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.25rem, 3.5vw, 1.6rem)",
            fontWeight: 800,
            margin: "0 0 0.75rem",
            letterSpacing: "-0.03em",
          }}
        >
          Could not load the verifier
        </h1>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 1.5rem",
          }}
        >
          The lookup tools hit an unexpected error. Retry, or verify a record ID directly if you have one.
        </p>
        <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Btn onClick={() => reset()}>Try again</Btn>
          <Btn href="/verify" variant="secondary">
            Open verifier
          </Btn>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1.25rem" }}>
          <Link href="/docs/partner-flow" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            Partner Flow docs
          </Link>
        </p>
      </div>
    </RedesignShell>
  );
}
