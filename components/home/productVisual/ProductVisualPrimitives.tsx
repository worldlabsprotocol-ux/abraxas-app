"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { CosmicCornerGlow, CosmicParticleField } from "@/components/home/cinematic/CosmicDemoEffects";
import { PremiumMeshBg } from "@/components/home/cinematic/PremiumDemoPrimitives";
import type { MeshKey } from "@/components/home/cinematic/demoPremium";
import { COSMIC_PALETTE, DEMO_MOTION, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";

export function ProductVisualFrame({
  mesh,
  accent,
  children,
  aspect = "phone",
}: {
  mesh: MeshKey;
  accent: string;
  children: ReactNode;
  aspect?: "phone" | "wide";
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: aspect === "phone" ? 380 : 520,
        margin: "0 auto",
        aspectRatio: aspect === "phone" ? "9 / 16" : "4 / 3",
        maxHeight: aspect === "phone" ? 520 : 400,
        borderRadius: 28,
        border: `1px solid ${accent}44`,
        overflow: "hidden",
        boxShadow: `0 40px 120px rgba(0,0,0,0.65), 0 0 60px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <PremiumMeshBg mesh={mesh} />
      <CosmicParticleField accent={accent} count={20} />
      <CosmicCornerGlow color={accent} />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(1.25rem, 4vw, 2rem)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function BigLabel({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        fontFamily: DEMO_TYPOGRAPHY.fontSans,
        fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
        fontWeight: 900,
        letterSpacing: "-0.04em",
        color: COSMIC_PALETTE.textPrimary,
        textAlign: "center",
        lineHeight: 1.05,
        textShadow: accent ? `0 0 40px ${accent}55` : undefined,
      }}
    >
      {children}
    </motion.div>
  );
}

export function MicroLabel({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <span
      style={{
        fontFamily: DEMO_TYPOGRAPHY.fontMono,
        fontSize: DEMO_TYPOGRAPHY.micro,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: accent ?? COSMIC_PALETTE.textMuted,
      }}
    >
      {children}
    </span>
  );
}

export function GlowOrb({
  size = 120,
  accent,
  icon,
  pulse = true,
}: {
  size?: number;
  accent: string;
  icon: ReactNode;
  pulse?: boolean;
}) {
  return (
    <motion.div
      animate={
        pulse
          ? {
              boxShadow: [
                `0 0 40px ${accent}44, 0 0 80px ${accent}22`,
                `0 0 64px ${accent}66, 0 0 120px ${accent}33`,
                `0 0 40px ${accent}44, 0 0 80px ${accent}22`,
              ],
            }
          : undefined
      }
      transition={DEMO_MOTION.glowPulse}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        background: `radial-gradient(circle at 30% 30%, ${accent}33, rgba(0,0,0,0.5))`,
        border: `2px solid ${accent}66`,
        marginBottom: 20,
      }}
    >
      {icon}
    </motion.div>
  );
}

export function FlowArrow({ accent }: { accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "12px 0",
        width: "min(200px, 70%)",
      }}
    >
      <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, transparent, ${accent})` }} />
      <motion.span
        animate={{ x: [0, 6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{ color: accent, fontSize: "1.25rem" }}
      >
        →
      </motion.span>
      <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </motion.div>
  );
}

export function StepDots({
  total,
  active,
  accent,
}: {
  total: number;
  active: number;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 16 }}>
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === active ? 24 : 8,
            opacity: i === active ? 1 : 0.35,
          }}
          style={{
            height: 8,
            borderRadius: 999,
            background: i <= active ? accent : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </div>
  );
}
