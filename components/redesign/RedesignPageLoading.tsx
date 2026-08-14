"use client";
// FILE: components/redesign/RedesignPageLoading.tsx
// Lightweight branded loading state for public Suspense fallbacks.

import { Spinner } from "@/components/ui/Spinner";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function RedesignPageLoading({
  label = "Loading Abraxas…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: compact ? "1.5rem 1rem" : "clamp(3rem, 12vw, 6rem) 1.5rem",
        minHeight: compact ? undefined : "40vh",
        color: "var(--text-muted)",
        fontFamily: FONT,
        fontSize: "0.82rem",
      }}
    >
      <Spinner size={22} label={label} />
      <span>{label}</span>
    </div>
  );
}
