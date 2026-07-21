"use client";

import { PassportFlowVisual } from "@/components/home/productVisual/PassportFlowVisual";
import { RwaUnlockVisual } from "@/components/home/productVisual/RwaUnlockVisual";
import { DashboardVisual } from "@/components/home/productVisual/DashboardVisual";

const EMBED: Record<string, { Component: React.ComponentType; scale: number; width: number }> = {
  passport: { Component: PassportFlowVisual, scale: 0.52, width: 340 },
  unlock: { Component: RwaUnlockVisual, scale: 0.52, width: 340 },
  dashboard: { Component: DashboardVisual, scale: 0.46, width: 460 },
};

export function InstitutionalProductEmbed({ type }: { type: keyof typeof EMBED }) {
  const { Component, scale, width } = EMBED[type];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          width,
          pointerEvents: "none",
        }}
      >
        <Component />
      </div>
    </div>
  );
}
