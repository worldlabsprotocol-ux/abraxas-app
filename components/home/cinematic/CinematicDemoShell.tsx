"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ACCENT, type MeshKey } from "./demoPremium";
import { PremiumEyebrow, PremiumHeadline, PremiumMeshBg } from "./PremiumDemoPrimitives";

const actEase = [0.22, 1, 0.36, 1] as const;
export { actEase };

const MESH_BY_VARIANT: Record<string, MeshKey> = {
  default: "gold",
  terminal: "emerald",
  blueprint: "ice",
  constellation: "violet",
  dossier: "gold",
  auditor: "emerald",
  market: "rose",
  policy: "slate",
};

export function CinematicDemoShell({
  act,
  actCount,
  actLabel,
  actCaption,
  variant = "default",
  compact = false,
  minHeight = 260,
  containerRef,
  children,
}: {
  act: number;
  actCount: number;
  actLabel: string;
  actCaption: string;
  variant?: string;
  compact?: boolean;
  minHeight?: number;
  containerRef?: React.Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const mesh = MESH_BY_VARIANT[variant] ?? "gold";
  const accent = ACCENT[mesh];
  const progress = act / actCount;

  return (
    <div ref={containerRef} className="cinematic-demo relative mx-auto w-full max-w-5xl">
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 32px 100px rgba(0,0,0,0.55)",
        }}
      >
        <PremiumMeshBg mesh={mesh} />

        <div className={`relative z-10 ${compact ? "px-4 py-5 sm:px-5" : "px-5 py-6 sm:px-8 sm:py-8"}`}>
          <PremiumEyebrow accent={accent}>{actLabel}</PremiumEyebrow>
          <PremiumHeadline mesh={mesh}>{actCaption}</PremiumHeadline>

          <div className="relative mt-6 sm:mt-8" style={{ minHeight }}>
            {children}
          </div>
        </div>

        {/* Subtle progress hairline — no countdown */}
        <div className="relative z-10 h-px bg-white/[0.04]">
          <motion.div
            className="h-full"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6, ease: actEase }}
            style={{
              background: `linear-gradient(90deg, ${accent}, ${accent}00)`,
              boxShadow: `0 0 12px ${accent}66`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
