"use client";
// FILE: components/redesign/VerificationBadge.tsx
// Premium verification chip. Dot + uppercase micro-label, color-coded by
// state. Used on asset cards and trust surfaces.

import { motion, useReducedMotion } from "framer-motion";
import { INSTITUTIONAL_GOLD } from "@/lib/design/institutionalTheme";

interface VerificationBadgeProps {
  label: string;
  color?: string;
  /** show an animated check (for the "verified" hero state) */
  check?: boolean;
}

export function VerificationBadge({ label, color = INSTITUTIONAL_GOLD, check = false }: VerificationBadgeProps) {
  const reduce = useReducedMotion();
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.4rem",
      padding: "0.3rem 0.625rem", borderRadius: 999,
      background: `${color}14`, border: `1px solid ${color}3D`,
      fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.62rem", fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", color,
      whiteSpace: "nowrap",
    }}>
      {check ? (
        <motion.svg width={11} height={11} viewBox="0 0 24 24" fill="none">
          <motion.path d="M4 12.5l5 5 11-12" stroke={color} strokeWidth={3}
            strokeLinecap="round" strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut", delay: 0.2 }} />
        </motion.svg>
      ) : (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color,
                       boxShadow: `0 0 6px ${color}` }} />
      )}
      {label}
    </span>
  );
}
