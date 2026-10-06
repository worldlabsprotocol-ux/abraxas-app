"use client";
// FILE: components/partner/GoodTroublePrivacySequence.tsx
// Visual narrowing for Good Trouble age proof — DOB private, 21+ remains.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionTransition, abxProofResolveVariants } from "@/lib/motion/abxMotionFramer";

export type GoodTroublePrivacyPhase = "dob" | "derive" | "redact" | "result" | "share" | "return";

const PHASE_COPY: Record<GoodTroublePrivacyPhase, string> = {
  dob: "Date of birth stays inside Abraxas",
  derive: "Age band derived privately",
  redact: "DOB no longer needed",
  result: "21+ eligibility prepared",
  share: "You approve what Good Trouble receives",
  return: "Return to Good Trouble",
};

export function GoodTroublePrivacySequence({ phase }: { phase: GoodTroublePrivacyPhase }) {
  const reduce = useReducedMotion();
  const phases: GoodTroublePrivacyPhase[] = ["dob", "derive", "redact", "result", "share", "return"];
  const activeIndex = phases.indexOf(phase);

  return (
    <div className="abx-gt-privacy-sequence" aria-label="Privacy narrowing sequence">
      <div className="abx-gt-privacy-sequence__vault">
        <motion.span
          className="abx-gt-privacy-sequence__field abx-gt-privacy-sequence__field--dob"
          animate={{
            opacity: activeIndex >= 2 ? 0.2 : 1,
            scale: activeIndex >= 2 ? 0.92 : 1,
            filter: activeIndex >= 2 ? "blur(2px)" : "blur(0px)",
          }}
          transition={abxMotionTransition("redact", { tier: "calm" })}
          style={{ fontFamily: ABX_FONT_MONO }}
        >
          DOB ••••
        </motion.span>
        {activeIndex >= 1 ? (
          <motion.span
            className="abx-gt-privacy-sequence__field abx-gt-privacy-sequence__field--band"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={abxMotionTransition("surface", { tier: "calm" })}
            style={{ fontFamily: ABX_FONT_MONO }}
          >
            Age band: 21+
          </motion.span>
        ) : null}
        {activeIndex >= 3 ? (
          <motion.div
            className="abx-gt-privacy-sequence__result"
            variants={abxProofResolveVariants({ reduce: !!reduce })}
            initial="hidden"
            animate="show"
          >
            <span style={{ fontFamily: ABX_FONT_MONO }}>21+ ELIGIBLE</span>
          </motion.div>
        ) : null}
      </div>
      <p className="abx-gt-privacy-sequence__caption" style={{ fontFamily: ABX_FONT_SANS }}>
        {PHASE_COPY[phase]}
      </p>
    </div>
  );
}
