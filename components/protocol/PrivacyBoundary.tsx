"use client";
// FILE: components/protocol/PrivacyBoundary.tsx
// Signature Abraxas privacy boundary — protected evidence stays inside; only the approved result crosses.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";

export interface PrivacyBoundaryProps {
  protectedItems: string[];
  disclosedLabel: string;
  disclosedResult?: string;
  /** When true, animates the signal crossing the boundary */
  signalActive?: boolean;
  compact?: boolean;
  className?: string;
}

export function PrivacyBoundary({
  protectedItems,
  disclosedLabel,
  disclosedResult,
  signalActive = false,
  compact = false,
  className = "",
}: PrivacyBoundaryProps) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : abxMotionDuration("protocol") / 1000;

  return (
    <div
      className={`abx-privacy-boundary ${compact ? "abx-privacy-boundary--compact" : ""} ${className}`.trim()}
      aria-label="Abraxas privacy boundary"
    >
      <div className="abx-privacy-boundary__zone abx-privacy-boundary__zone--inside">
        <span className="abx-privacy-boundary__zone-label" style={{ fontFamily: ABX_FONT_MONO }}>
          Inside Abraxas
        </span>
        <ul className="abx-privacy-boundary__protected-list" aria-label="Protected evidence">
          {protectedItems.map((item) => (
            <li key={item} className="abx-privacy-boundary__protected-item" style={{ fontFamily: ABX_FONT_SANS }}>
              <span className="abx-privacy-boundary__withheld-dot" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="abx-privacy-boundary__veil" aria-hidden>
        <div className="abx-privacy-boundary__veil-line" />
        <span className="abx-privacy-boundary__veil-label" style={{ fontFamily: ABX_FONT_MONO }}>
          Privacy boundary
        </span>
        {signalActive && (
          <motion.div
            className="abx-privacy-boundary__signal"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden
          />
        )}
      </div>

      <div className="abx-privacy-boundary__zone abx-privacy-boundary__zone--outside">
        <span className="abx-privacy-boundary__zone-label" style={{ fontFamily: ABX_FONT_MONO }}>
          Partner receives
        </span>
        <motion.div
          className="abx-privacy-boundary__disclosed"
          initial={false}
          animate={
            signalActive
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0.55, y: 4, scale: 0.98 }
          }
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="abx-privacy-boundary__disclosed-badge" style={{ fontFamily: ABX_FONT_MONO }}>
            Verified
          </span>
          <span className="abx-privacy-boundary__disclosed-label" style={{ fontFamily: ABX_FONT_SANS }}>
            {disclosedLabel}
          </span>
          {disclosedResult ? (
            <code className="abx-privacy-boundary__disclosed-code" style={{ fontFamily: ABX_FONT_MONO }}>
              {disclosedResult}
            </code>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}

export function PrivacyBoundaryLegend({ children }: { children?: ReactNode }) {
  return (
    <p className="abx-privacy-boundary__legend" style={{ fontFamily: ABX_FONT_SANS }}>
      {children ?? "Sensitive evidence stays inside Abraxas. Only the policy answer crosses the boundary."}
    </p>
  );
}
