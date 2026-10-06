"use client";
// FILE: components/protocol/AbxChoiceCard.tsx
// Premium interactive selection — deliberate path choice with immediate spatial feedback.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";

export interface AbxChoiceCardProps {
  id: string;
  title: string;
  description?: string;
  meta?: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  children?: ReactNode;
  accent?: string;
}

export function AbxChoiceCard({
  id,
  title,
  description,
  meta,
  selected = false,
  disabled = false,
  onSelect,
  children,
  accent = "#10B981",
}: AbxChoiceCardProps) {
  const reduceMotion = useReducedMotion();
  const interactive = Boolean(onSelect) && !disabled;

  const body = (
    <>
      <div className="abx-choice-card__head">
        <span
          className={`abx-choice-card__indicator ${selected ? "abx-choice-card__indicator--selected" : ""}`}
          style={{ borderColor: selected ? accent : "var(--border)", background: selected ? `${accent}22` : "transparent" }}
          aria-hidden
        />
        <div className="abx-choice-card__copy">
          <h3 className="abx-choice-card__title" style={{ fontFamily: ABX_FONT_SANS }}>
            {title}
          </h3>
          {meta ? (
            <span className="abx-choice-card__meta" style={{ fontFamily: ABX_FONT_MONO }}>
              {meta}
            </span>
          ) : null}
        </div>
      </div>
      {description ? (
        <p className="abx-choice-card__description" style={{ fontFamily: ABX_FONT_SANS }}>
          {description}
        </p>
      ) : null}
      {children ? (
        <motion.div
          className="abx-choice-card__detail"
          initial={false}
          animate={{ opacity: selected ? 1 : 0.72, height: selected ? "auto" : "auto" }}
          transition={{ duration: reduceMotion ? 0 : abxMotionDuration("surface") / 1000 }}
        >
          {children}
        </motion.div>
      ) : null}
    </>
  );

  const className = [
    "abx-choice-card",
    selected ? "abx-choice-card--selected" : "",
    disabled ? "abx-choice-card--disabled" : "",
    interactive ? "abx-choice-card--interactive" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    ["--abx-choice-accent" as string]: accent,
    borderColor: selected ? `${accent}66` : undefined,
    boxShadow: selected ? `0 8px 28px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.05)` : undefined,
  };

  if (interactive) {
    return (
      <motion.button
        type="button"
        id={id}
        className={className}
        style={style}
        onClick={onSelect}
        aria-pressed={selected}
        disabled={disabled}
        whileHover={reduceMotion ? undefined : { y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        transition={{ duration: abxMotionDuration("micro") / 1000 }}
      >
        {body}
      </motion.button>
    );
  }

  return (
    <div id={id} className={className} style={style} aria-current={selected ? "true" : undefined}>
      {body}
    </div>
  );
}
