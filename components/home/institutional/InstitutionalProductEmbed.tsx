"use client";

import { PassportFlowVisual } from "@/components/home/productVisual/PassportFlowVisual";
import { RwaUnlockVisual } from "@/components/home/productVisual/RwaUnlockVisual";
import { DashboardVisual } from "@/components/home/productVisual/DashboardVisual";

const EMBED: Record<string, { Component: React.ComponentType; scale: number; width: number }> = {
  passport: { Component: PassportFlowVisual, scale: 0.48, width: 360 },
  unlock: { Component: RwaUnlockVisual, scale: 0.48, width: 360 },
  dashboard: { Component: DashboardVisual, scale: 0.42, width: 480 },
};

export function InstitutionalProductEmbed({ type }: { type: keyof typeof EMBED }) {
  const { Component, scale, width } = EMBED[type];
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
        maxHeight: 260,
        marginTop: -8,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          width,
          pointerEvents: "none",
        }}
      >
        <Component />
      </div>
    </div>
  );
}
