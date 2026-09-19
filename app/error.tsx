"use client";
// FILE: app/error.tsx
// Branded recoverable error. Never show Vercel or internal setup copy.

import { useEffect } from "react";
import Link from "next/link";
import { AbxEmptyState } from "@/components/design/AbxPrimitives";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { Btn } from "@/components/redesign/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const code = "fail_codes" in error ? (error as { fail_codes?: string[] }).fail_codes : undefined;
    console.error("public_surface.recoverable_error", { fail_codes: code ?? ["unknown"] });
  }, [error]);

  return (
    <AbxPageShell accent="developer" maxWidth={560}>
      <AbxEmptyState
        tone="error"
        title="This page could not load"
        message="Abraxas hit a recoverable server error. Try again. No secrets, receipts, or wallet details are shown here."
        actionLabel="Try again"
        onAction={() => reset()}
      />
      <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
        <Btn href="/developers/integration-studio" variant="secondary" size="sm">
          Integration Studio
        </Btn>
        <Btn href="/" variant="ghost" size="sm">
          Home
        </Btn>
      </div>
      <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1rem" }}>
        <Link href="/docs" style={{ color: "var(--abx-accent)", textDecoration: "none", fontWeight: 600 }}>
          Docs
        </Link>
      </p>
    </AbxPageShell>
  );
}
