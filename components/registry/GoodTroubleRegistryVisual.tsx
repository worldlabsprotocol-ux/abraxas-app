// FILE: components/registry/GoodTroubleRegistryVisual.tsx
// Placeholder card art until partner photography is on file.

import { GOOD_TROUBLE_BRAND } from "@/lib/goodTrouble/constants";

export function GoodTroubleRegistryVisual({ height = 220 }: { height?: number }) {
  return (
    <div
      aria-hidden
      style={{
        height,
        width: "100%",
        background: "linear-gradient(145deg, #0a1f14 0%, #06090B 55%, #0d2818 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.35rem",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <div style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: height < 180 ? "1.05rem" : "1.35rem",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        color: "#10B981",
        lineHeight: 1.1,
      }}>
        {GOOD_TROUBLE_BRAND.name}
      </div>
      <div style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: height < 180 ? "0.62rem" : "0.72rem",
        fontWeight: 600,
        color: "rgba(148,163,184,0.95)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}>
        {GOOD_TROUBLE_BRAND.location} · Organic · Pilot
      </div>
    </div>
  );
}
