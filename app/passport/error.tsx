"use client";
// FILE: app/passport/error.tsx
// Recoverable error boundary for the Passport experience.

import { useEffect } from "react";
import Link from "next/link";
import { AbxEmptyState } from "@/components/design/AbxPrimitives";
import { AbxPageShell } from "@/components/design/AbxPageShell";

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
    <AbxPageShell accent="passport" maxWidth={520}>
      <AbxEmptyState
        tone="error"
        title="Something went wrong loading Passport"
        message="This is usually temporary. Try again, or return home and open Passport from the navigation menu."
        actionLabel="Try again"
        onAction={() => reset()}
      />
      <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.82rem" }}>
        <Link href="/" style={{ color: "var(--abx-accent)", textDecoration: "none", fontWeight: 600 }}>
          Return home
        </Link>
        {" | "}
        <Link href="/docs/passport-spec" style={{ color: "var(--abx-accent)", textDecoration: "none", fontWeight: 600 }}>
          Passport docs
        </Link>
      </p>
    </AbxPageShell>
  );
}
