"use client";
// FILE: app/verify/error.tsx
// Recoverable error boundary for the public verifier experience.

import { useEffect } from "react";
import Link from "next/link";
import { AbxEmptyState } from "@/components/design/AbxPrimitives";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { Btn } from "@/components/redesign/ui";
import {
  HOLDER_VERIFY_DEFAULT_PATH,
  VERIFY_ERROR_BODY,
  VERIFY_ERROR_HOLDER_LINK_LABEL,
} from "@/lib/integrate/partnerJourney";

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
    <AbxPageShell accent="verify" maxWidth={520}>
      <AbxEmptyState
        tone="error"
        title="Could not load the verifier"
        message={VERIFY_ERROR_BODY}
        actionLabel="Try again"
        onAction={() => reset()}
      />
      <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
        <Btn href="/verify" variant="secondary" size="sm">
          Open partner verify
        </Btn>
        <Btn href={HOLDER_VERIFY_DEFAULT_PATH} variant="ghost" size="sm">
          {VERIFY_ERROR_HOLDER_LINK_LABEL}
        </Btn>
      </div>
      <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1rem" }}>
        <Link href="/docs/partner-flow" style={{ color: "var(--abx-accent)", textDecoration: "none", fontWeight: 600 }}>
          Partner Flow docs
        </Link>
      </p>
    </AbxPageShell>
  );
}
