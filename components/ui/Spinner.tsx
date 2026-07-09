"use client";
// FILE: components/ui/Spinner.tsx

const ACCENT = "#10B981";

export function Spinner({
  size = 18,
  color = ACCENT,
  label = "Loading",
}: {
  size?: number;
  color?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}33`,
        borderTopColor: color,
        animation: "abxSpin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
