"use client";
// FILE: app/passport/error.tsx
// Recoverable error boundary for the Passport experience.

import { useEffect } from "react";
import Link from "next/link";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export default function PassportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[passport]", error);
  }, [error]);

  return (
    <div
      data-theme="dark"
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        color: "var(--text-primary)",
      }}
    >
      <RedesignNav />
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
          PASSPORT
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
          Something went wrong loading Passport
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
          This is usually temporary. Try again, or return home and open Passport from the navigation menu.
        </p>
        <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Btn onClick={() => reset()}>Try again</Btn>
          <Btn href="/" variant="secondary">
            Return home
          </Btn>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1.25rem" }}>
          Need help?{" "}
          <Link href="/docs/passport-spec" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            Passport docs
          </Link>
        </p>
      </div>
      <RedesignFooter />
    </div>
  );
}
