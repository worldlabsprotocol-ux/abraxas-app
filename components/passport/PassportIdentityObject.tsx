"use client";
// FILE: components/passport/PassportIdentityObject.tsx
// Passport as a first-class Abraxas object — not a generic dashboard card.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_DISPLAY, ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxObjectEnterVariants } from "@/lib/motion/abxMotionFramer";

export type PassportLifecycleState =
  | "unsigned"
  | "basic"
  | "verified"
  | "reusable"
  | "attention";

const STATE_LABEL: Record<PassportLifecycleState, string> = {
  unsigned: "Sign in to begin",
  basic: "Account secured",
  verified: "Verified",
  reusable: "Ready to reuse",
  attention: "Needs attention",
};

export function PassportIdentityObject({
  state,
  holderLabel,
  detail,
  completionPercent,
}: {
  state: PassportLifecycleState;
  holderLabel: string;
  detail?: string;
  completionPercent?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      className={`abx-passport-object abx-passport-object--${state}`}
      variants={abxObjectEnterVariants({ reduce: !!reduce, tier: "calm" })}
      initial="hidden"
      animate="show"
      aria-label={`Passport: ${STATE_LABEL[state]}`}
    >
      <header className="abx-passport-object__header">
        <span className="abx-passport-object__mark" aria-hidden />
        <div>
          <p className="abx-passport-object__eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Abraxas Passport
          </p>
          <h2 className="abx-passport-object__title" style={{ fontFamily: ABX_FONT_DISPLAY }}>
            {holderLabel}
          </h2>
        </div>
        <span className={`abx-passport-object__state abx-passport-object__state--${state}`} style={{ fontFamily: ABX_FONT_MONO }}>
          {STATE_LABEL[state]}
        </span>
      </header>

      {detail ? (
        <p className="abx-passport-object__detail" style={{ fontFamily: ABX_FONT_SANS }}>
          {detail}
        </p>
      ) : null}

      {typeof completionPercent === "number" ? (
        <div className="abx-passport-object__progress" aria-hidden="true">
          <div
            className="abx-passport-object__progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
          />
        </div>
      ) : null}
    </motion.article>
  );
}
