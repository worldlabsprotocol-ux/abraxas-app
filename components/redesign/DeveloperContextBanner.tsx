// FILE: components/redesign/DeveloperContextBanner.tsx
// Persistent indicator for developer-only surfaces.

import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function DeveloperContextBanner({
  title = "Developer tools",
  description = "This page is for integrators and engineers — not the customer verification experience.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="note"
      aria-label={title}
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "0.65rem 1rem",
        borderRadius: 12,
        border: "1px solid rgba(167,139,250,0.28)",
        background: "rgba(167,139,250,0.08)",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa" }}>
          {title}
        </p>
        <p style={{ margin: "0.2rem 0 0", fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
          {description}
        </p>
      </div>
    </div>
  );
}
