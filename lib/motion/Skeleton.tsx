"use client";
// FILE: lib/motion/Skeleton.tsx
// Shimmer skeleton loader (not a spinner). Uses the global `abxShimmer`
// keyframes defined in app/globals.css. Themed via CSS variables so it
// works in both light and dark.

import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
  className?: string;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, style, className }: SkeletonProps) {
  return (
    <span
      className={`abx-skeleton ${className ?? ""}`}
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

interface SkeletonCardProps {
  lines?: number;
  style?: CSSProperties;
}

export function SkeletonCard({ lines = 3, style }: SkeletonCardProps) {
  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
        ...style,
      }}
    >
      <Skeleton height={120} radius={12} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={`${90 - i * 18}%`} />
      ))}
    </div>
  );
}
