"use client";
// FILE: components/design/AbxAtmosphericBackground.tsx
// Route accent aware midnight atmosphere with soft radial color fields.

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { accentForPath } from "@/lib/design/routeAccent";
import { ABX_ATMOSPHERE, type AbxTabAccent } from "@/lib/design/abraxasDesignSystem";

function RadialField({
  color,
  style,
  animate,
  reduce,
}: {
  color: string;
  style: React.CSSProperties;
  animate?: { opacity: number[] };
  reduce: boolean;
}) {
  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={reduce || !animate ? undefined : animate}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      style={{
        position: "absolute",
        pointerEvents: "none",
        background: `radial-gradient(50% 50% at 50% 50%, ${color} 0%, transparent 72%)`,
        filter: "blur(28px)",
        maxWidth: "100vw",
        ...style,
      }}
    />
  );
}

export function AbxAtmosphericBackground({ accent }: { accent?: AbxTabAccent }) {
  const pathname = usePathname() ?? "/";
  const resolved = accent ?? accentForPath(pathname);
  const atmo = ABX_ATMOSPHERE[resolved];
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="abx-atmospheric-bg"
      data-abx-accent={resolved}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <RadialField
        color={atmo.primary}
        reduce={!!reduce}
        animate={{ opacity: [0.55, 0.78, 0.55] }}
        style={{
          top: "-14%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(1100px, 120vw)",
          height: "min(620px, 70vh)",
        }}
      />
      <RadialField
        color={atmo.secondary}
        reduce={!!reduce}
        animate={{ opacity: [0.4, 0.62, 0.4] }}
        style={{
          bottom: "0%",
          left: "-8%",
          width: "min(680px, 90vw)",
          height: "min(480px, 55vh)",
        }}
      />
      <RadialField
        color={atmo.tertiary}
        reduce={!!reduce}
        animate={{ opacity: [0.35, 0.55, 0.35] }}
        style={{
          top: "18%",
          right: "-10%",
          width: "min(560px, 85vw)",
          height: "min(420px, 50vh)",
        }}
      />
    </div>
  );
}
