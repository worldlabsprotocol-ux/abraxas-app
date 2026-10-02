"use client";
// FILE: lib/motion/cinematic/DataRedactionText.tsx
// Synthetic fields redact as scroll progress advances.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_DISPLAY, ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";

export function DataRedactionText({
  fields,
  progress,
  resolvedLabel,
}: {
  fields: readonly string[];
  /** 0 = all visible, 1 = all redacted */
  progress: number;
  resolvedLabel?: string;
}) {
  const reduce = useReducedMotion();
  const visibleCount = reduce
    ? 0
    : Math.max(0, Math.ceil(fields.length * (1 - progress)));

  return (
    <div className="abx-data-redaction" aria-live="polite">
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: "0.55rem",
        }}
      >
        {fields.map((field, index) => {
          const redacted = index >= visibleCount;
          return (
            <motion.li
              key={field}
              layout={!reduce}
              animate={{
                opacity: redacted ? 0.12 : 1,
                filter: redacted ? "blur(4px)" : "blur(0px)",
                scale: redacted ? 0.98 : 1,
              }}
              transition={{
                duration: reduce ? 0 : abxMotionDuration("redact") / 1000,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "0.65rem 0.85rem",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: redacted ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.03)",
              }}
            >
              <span
                style={{
                  fontFamily: ABX_FONT_MONO,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: redacted ? "var(--text-muted)" : "var(--text-secondary)",
                  textDecoration: redacted ? "line-through" : "none",
                }}
              >
                {field}
              </span>
              <span
                style={{
                  fontFamily: ABX_FONT_SANS,
                  fontSize: "0.68rem",
                  color: "var(--text-muted)",
                }}
              >
                {redacted ? "—" : "••••••"}
              </span>
            </motion.li>
          );
        })}
      </ul>
      {resolvedLabel && progress > 0.65 ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: abxMotionDuration("verify") / 1000 }}
          className="abx-data-redaction__result"
          style={{
            marginTop: "1.25rem",
            padding: "1rem 1.15rem",
            borderRadius: 14,
            border: "1px solid rgba(45, 212, 191, 0.35)",
            background: "rgba(45, 212, 191, 0.08)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: ABX_FONT_MONO,
              fontSize: "0.68rem",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              margin: "0 0 0.35rem",
            }}
          >
            VERIFIED ANSWER
          </p>
          <p
            style={{
              fontFamily: ABX_FONT_DISPLAY,
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 900,
              color: "#2DD4BF",
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            {resolvedLabel}
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}
