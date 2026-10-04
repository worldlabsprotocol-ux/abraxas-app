"use client";
// FILE: components/partner/holder/PrivacyBoundary.tsx
// They receive vs stays private — first-class visual boundary.

import { motion, useReducedMotion } from "framer-motion";
import { abxMotionTransition } from "@/lib/motion/abxMotionFramer";
import { holderBody, holderEyebrow, HOLDER_FONT } from "./styles";

export interface PrivacyBoundaryProps {
  theyReceive: string;
  staysPrivate: string[];
}

export function PrivacyBoundary({ theyReceive, staysPrivate }: PrivacyBoundaryProps) {
  const reduce = useReducedMotion();
  const transition = abxMotionTransition("surface", { tier: "calm" });

  return (
    <div
      className="abx-privacy-boundary"
      style={{
        display: "grid",
        gap: "0.65rem",
        marginTop: "0.85rem",
      }}
    >
      <motion.div
        className="abx-privacy-boundary__receive"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        style={boundaryPanel("#10B981", "rgba(16,185,129,0.08)")}
      >
        <p style={{ ...holderEyebrow, color: "#10B981" }}>They&apos;ll receive</p>
        <p style={{ ...receiveLine, margin: "0.35rem 0 0" }}>
          <span aria-hidden style={{ color: "#10B981", fontWeight: 800 }}>✓ </span>
          {theyReceive}
        </p>
      </motion.div>

      <motion.div
        className="abx-privacy-boundary__private"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: reduce ? 0 : 0.08 }}
        style={boundaryPanel("var(--text-muted)", "rgba(255,255,255,0.04)")}
      >
        <p style={holderEyebrow}>Stays private</p>
        <ul
          style={{
            listStyle: "none",
            margin: "0.35rem 0 0",
            padding: 0,
            display: "grid",
            gap: "0.2rem",
          }}
        >
          {staysPrivate.map((item) => (
            <li key={item} style={{ ...holderBody, fontSize: "0.78rem", color: "var(--text-primary)" }}>
              {item}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

function boundaryPanel(accent: string, background: string): React.CSSProperties {
  return {
    padding: "0.7rem 0.8rem",
    borderRadius: 12,
    border: `1px solid ${accent === "#10B981" ? "rgba(16,185,129,0.28)" : "rgba(255,255,255,0.08)"}`,
    background,
  };
}

const receiveLine: React.CSSProperties = {
  fontFamily: HOLDER_FONT,
  fontSize: "0.88rem",
  fontWeight: 700,
  lineHeight: 1.45,
  color: "var(--text-primary)",
};
