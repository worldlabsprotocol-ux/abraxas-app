"use client";
// FILE: app/admin/error.tsx
// Recoverable error boundary for admin routes.

import { useEffect } from "react";
import Link from "next/link";
import { AbxEmptyState } from "@/components/design/AbxPrimitives";
import { Btn } from "@/components/redesign/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div data-theme="dark" className="abx-admin-shell" style={{ display: "grid", placeItems: "center", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <AbxEmptyState
          tone="error"
          title="Something went wrong"
          message="This admin page hit an unexpected error. Try again, or return to a known admin route."
          actionLabel="Try again"
          onAction={() => reset()}
        />
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Btn href="/admin/identity" variant="secondary" size="sm">
            Open Identity
          </Btn>
        </div>
      </div>
    </div>
  );
}
