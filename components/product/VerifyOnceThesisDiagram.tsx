"use client";
// FILE: components/product/VerifyOnceThesisDiagram.tsx
// Animated product thesis — verify once, answer many questions.

import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";
import {
  THESIS_APPLICATION_ASKS,
  THESIS_PROTECTED_EVIDENCE,
  VERIFY_ONCE_THESIS_HEADLINE,
  VERIFY_ONCE_THESIS_LEAD,
  VERIFY_ONCE_THESIS_LEGEND,
  type ThesisApplicationAsk,
} from "@/lib/product/verifyOnceThesisCopy";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;
const TEAL = "#2DD4BF";
const GOLD = "#E8C547";

/** Presentation-only animation phases. No product state. */
type ThesisPhase = "establish" | "reuse" | "complete";

export function VerifyOnceThesisDiagram() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<ThesisPhase>(reduceMotion ? "complete" : "establish");
  const [activeAskIndex, setActiveAskIndex] = useState(reduceMotion ? THESIS_APPLICATION_ASKS.length - 1 : -1);
  const duration = reduceMotion ? 0 : abxMotionDuration("protocol") / 1000;

  useEffect(() => {
    if (reduceMotion) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase("reuse"), 1400));
    timers.push(setTimeout(() => setActiveAskIndex(0), 2200));
    timers.push(setTimeout(() => setActiveAskIndex(1), 3400));
    timers.push(setTimeout(() => setActiveAskIndex(2), 4600));
    timers.push(setTimeout(() => setPhase("complete"), 5600));

    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  const showPassportReady = phase !== "establish" || reduceMotion;
  const showApps = phase !== "establish" || reduceMotion;

  return (
    <section
      className="abx-thesis-diagram abx-home-section-center"
      aria-labelledby="verify-once-thesis-heading"
      aria-describedby="verify-once-thesis-lead"
    >
      <div className="abx-home-intro" style={{ marginBottom: "1.25rem" }}>
        <h2
          id="verify-once-thesis-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.25rem, 3.2vw, 1.55rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: "0 0 0.65rem",
          }}
        >
          {VERIFY_ONCE_THESIS_HEADLINE}
        </h2>
        <p
          id="verify-once-thesis-lead"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(0.88rem, 2.2vw, 0.98rem)",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {VERIFY_ONCE_THESIS_LEAD}
        </p>
      </div>

      <div className="abx-thesis-diagram__canvas" role="img" aria-label={VERIFY_ONCE_THESIS_LEGEND}>
        <div className="abx-thesis-diagram__column abx-thesis-diagram__column--holder">
          <ThesisNode label="You" sublabel="Holder" tone="holder" />
          <motion.div
            className="abx-thesis-diagram__flow-arrow"
            aria-hidden
            initial={false}
            animate={{ opacity: showPassportReady ? 1 : 0.4 }}
            transition={{ duration: duration * 0.6 }}
          >
            ↓
          </motion.div>
          <motion.div
            className="abx-thesis-diagram__evidence-chip"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: reduceMotion ? 0 : 0.3 }}
            style={{ fontFamily: MONO }}
          >
            Evidence once
          </motion.div>
        </div>

        <div className="abx-thesis-diagram__column abx-thesis-diagram__column--passport">
          <motion.div
            className={`abx-thesis-diagram__passport ${showPassportReady ? "abx-thesis-diagram__passport--ready" : ""}`}
            initial={false}
            animate={
              showPassportReady
                ? { scale: 1, borderColor: `${TEAL}66` }
                : { scale: 0.98, borderColor: "var(--border-strong)" }
            }
            transition={{ duration }}
          >
            <span className="abx-thesis-diagram__passport-label" style={{ fontFamily: MONO }}>
              Abraxas Passport
            </span>
            <span className="abx-thesis-diagram__passport-state" style={{ fontFamily: FONT }}>
              {showPassportReady ? "Verified · ready to reuse" : "Establishing evidence…"}
            </span>
            <ul className="abx-thesis-diagram__protected-list" aria-label="Stays inside Abraxas">
              {THESIS_PROTECTED_EVIDENCE.map((item) => (
                <li key={item} style={{ fontFamily: FONT }}>
                  <span className="abx-thesis-diagram__withheld-dot" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <div className="abx-thesis-diagram__boundary" aria-hidden>
            <span style={{ fontFamily: MONO }}>Privacy boundary</span>
          </div>
        </div>

        <div className="abx-thesis-diagram__column abx-thesis-diagram__column--apps">
          <AnimatePresence>
            {showApps
              ? THESIS_APPLICATION_ASKS.map((ask, index) => (
                <ApplicationAskCard
                  key={ask.id}
                  ask={ask}
                  active={reduceMotion || activeAskIndex >= index}
                  showAnswer={reduceMotion || activeAskIndex >= index}
                  reduceMotion={Boolean(reduceMotion)}
                  delay={index * 0.08}
                />
              ))
              : null}
          </AnimatePresence>
        </div>
      </div>

      <p className="abx-thesis-diagram__legend" style={{ fontFamily: FONT }}>
        {VERIFY_ONCE_THESIS_LEGEND}
      </p>

      <div className="abx-thesis-diagram__contrast" aria-hidden>
        <span style={{ fontFamily: MONO, color: "var(--text-muted)" }}>Not sent outward</span>
        <span style={{ fontFamily: MONO, color: TEAL }}>Minimal answer only</span>
      </div>
    </section>
  );
}

function ThesisNode({
  label,
  sublabel,
  tone,
}: {
  label: string;
  sublabel: string;
  tone: "holder" | "app";
}) {
  return (
    <div className={`abx-thesis-diagram__node abx-thesis-diagram__node--${tone}`}>
      <span className="abx-thesis-diagram__node-label" style={{ fontFamily: FONT }}>
        {label}
      </span>
      <span className="abx-thesis-diagram__node-sublabel" style={{ fontFamily: MONO }}>
        {sublabel}
      </span>
    </div>
  );
}

function ApplicationAskCard({
  ask,
  active,
  showAnswer,
  reduceMotion,
  delay,
}: {
  ask: ThesisApplicationAsk;
  active: boolean;
  showAnswer: boolean;
  reduceMotion: boolean;
  delay: number;
}) {
  const duration = reduceMotion ? 0 : abxMotionDuration("surface") / 1000;

  return (
    <motion.div
      className={`abx-thesis-diagram__app-card ${active ? "abx-thesis-diagram__app-card--active" : ""}`}
      initial={reduceMotion ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: active ? 1 : 0.35, x: 0 }}
      transition={{ duration, delay: reduceMotion ? 0 : delay }}
    >
      <div className="abx-thesis-diagram__app-header">
        <span className="abx-thesis-diagram__app-name" style={{ fontFamily: MONO }}>
          {ask.name}
        </span>
        <span className="abx-thesis-diagram__app-question" style={{ fontFamily: FONT }}>
          {ask.question}
        </span>
      </div>
      <motion.div
        className="abx-thesis-diagram__app-answer"
        initial={false}
        animate={
          showAnswer
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0.96 }
        }
        transition={{ duration: duration * 1.2, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden={!showAnswer}
      >
        <span className="abx-thesis-diagram__answer-label" style={{ fontFamily: FONT }}>
          {ask.answer}
        </span>
        <code className="abx-thesis-diagram__answer-code" style={{ fontFamily: MONO }}>
          {ask.answerCode} ✓
        </code>
      </motion.div>
      {showAnswer && active ? (
        <motion.span
          className="abx-thesis-diagram__reuse-badge"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontFamily: MONO, color: GOLD }}
          aria-hidden
        >
          Reused evidence
        </motion.span>
      ) : null}
    </motion.div>
  );
}
