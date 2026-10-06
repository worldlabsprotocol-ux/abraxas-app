"use client";
// FILE: components/partner/holder/VerificationProgress.tsx
// Truthful checking states — no developer loading theater.

import { motion, useReducedMotion } from "framer-motion";
import { abxMotionTransition } from "@/lib/motion/abxMotionFramer";
import type { HolderCheckingPhase } from "@/lib/partner/holderExperience/presentation";
import { resolveHolderCheckingCopy } from "@/lib/partner/holderExperience/presentation";
import { holderBody, HOLDER_FONT } from "./styles";

export interface VerificationProgressProps {
  phase: HolderCheckingPhase;
}

export function VerificationProgress({ phase }: VerificationProgressProps) {
  if (phase === "idle") return null;

  const reduce = useReducedMotion();
  const message = resolveHolderCheckingCopy(phase);
  const confirmed = phase === "confirmed";

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="abx-verification-progress"
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={abxMotionTransition("micro", { tier: "calm" })}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        marginTop: "0.75rem",
        padding: "0.65rem 0.75rem",
        borderRadius: 10,
        border: `1px solid ${confirmed ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.1)"}`,
        background: confirmed ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
      }}
    >
      {confirmed ? (
        <span aria-hidden style={{ color: "#10B981", fontWeight: 800, fontSize: "0.9rem" }}>✓</span>
      ) : (
        <span
          aria-hidden
          className="abx-verification-progress__indicator"
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid rgba(16,185,129,0.35)",
            borderTopColor: "#10B981",
            animation: reduce ? "none" : "abx-holder-spin 0.9s linear infinite",
          }}
        />
      )}
      <p style={{ ...holderBody, margin: 0, fontFamily: HOLDER_FONT, fontWeight: confirmed ? 700 : 500 }}>
        {message}
      </p>
      <style>{`
        @keyframes abx-holder-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .abx-verification-progress__indicator { animation: none !important; border-top-color: rgba(16,185,129,0.35); }
        }
      `}</style>
    </motion.div>
  );
}
