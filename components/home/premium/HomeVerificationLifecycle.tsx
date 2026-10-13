"use client";

import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CINEMATIC_VPR_SIM_LABEL } from "@/lib/home/cinematicHomeCopy";

type StageId = "evidence" | "verify" | "policy" | "receipt" | "independent";

const STAGES: {
  id: StageId;
  label: string;
  title: string;
  body: string;
  funnel: number;
}[] = [
  {
    id: "evidence",
    label: "Evidence",
    title: "Evidence submitted",
    body: "You provide verification material once. It stays on your side of the boundary.",
    funnel: 100,
  },
  {
    id: "verify",
    label: "Private",
    title: "Private verification",
    body: "Abraxas checks your claim without sending raw identity fields to partners.",
    funnel: 78,
  },
  {
    id: "policy",
    label: "Policy",
    title: "Policy evaluation",
    body: "Each app asks its own policy question. One approved answer does not approve another policy.",
    funnel: 52,
  },
  {
    id: "receipt",
    label: "Receipt",
    title: "Signed receipt",
    body: "The app receives a small decision — for example, eligible for 21+ — not your documents.",
    funnel: 34,
  },
  {
    id: "independent",
    label: "Audit",
    title: "Independent verification",
    body: "Others can confirm the receipt is valid, current, and unrevoked — without seeing your private evidence.",
    funnel: 22,
  },
];

/** Signature A — narrowing verification lifecycle (manual pace, no auto-advance). */
export function HomeVerificationLifecycle() {
  const [stage, setStage] = useState<StageId>("evidence");
  const reduceMotion = useReducedMotion();
  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  const active = STAGES.find((s) => s.id === stage) ?? STAGES[0];
  const select = useCallback((id: StageId) => setStage(id), []);

  const goPrev = () => {
    if (stageIndex > 0) setStage(STAGES[stageIndex - 1]!.id);
  };
  const goNext = () => {
    if (stageIndex < STAGES.length - 1) setStage(STAGES[stageIndex + 1]!.id);
  };

  return (
    <div id="how-abraxas-works" className="abx-premium-lifecycle">
      <p className="abx-v2-eyebrow">Verification lifecycle</p>
      <h2 id="home-lifecycle-heading" className="abx-v2-section-title abx-premium-lifecycle__title">
        Information narrows at each boundary
      </h2>
      <p className="abx-premium-lifecycle__sim">{CINEMATIC_VPR_SIM_LABEL}</p>
      <p className="abx-premium-lifecycle__hint">Choose a step below — the sequence does not auto-advance.</p>

      <div className="abx-premium-lifecycle__layout abx-premium-surface-open">
        <div className="abx-premium-lifecycle__funnel" aria-hidden="true">
          <div className="abx-premium-lifecycle__funnel-track">
            <motion.div
              className="abx-premium-lifecycle__funnel-fill"
              animate={{ width: `${active.funnel}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="abx-premium-lifecycle__boundary">
            <span>Partner sees only scoped answers</span>
          </div>
          <div className="abx-premium-lifecycle__evidence-packet">
            <span className={stage === "evidence" ? "" : "abx-premium-lifecycle__redacted"}>ID scan</span>
            <span className={stage === "evidence" || stage === "verify" ? "" : "abx-premium-lifecycle__redacted"}>
              Date of birth
            </span>
            <span
              className={
                stage === "receipt" || stage === "independent"
                  ? "abx-premium-lifecycle__answer"
                  : "abx-premium-lifecycle__redacted"
              }
            >
              {stage === "receipt" || stage === "independent" ? "PERMIT · 21+" : "Full profile"}
            </span>
          </div>
        </div>

        <div className="abx-premium-lifecycle__controls">
          <div className="abx-premium-lifecycle__steps" role="tablist" aria-label="Verification lifecycle stages">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={`lifecycle-tab-${s.id}`}
                aria-selected={s.id === stage}
                aria-controls="lifecycle-panel"
                className={`abx-premium-lifecycle__step${s.id === stage ? " abx-premium-lifecycle__step--active" : ""}`}
                onClick={() => select(s.id)}
              >
                <span className="abx-premium-lifecycle__step-label">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="abx-premium-lifecycle__nav">
            <button type="button" className="abx-premium-lifecycle__nav-btn" onClick={goPrev} disabled={stageIndex <= 0}>
              Previous step
            </button>
            <button
              type="button"
              className="abx-premium-lifecycle__nav-btn"
              onClick={goNext}
              disabled={stageIndex >= STAGES.length - 1}
            >
              Next step
            </button>
          </div>

          <motion.div
            id="lifecycle-panel"
            role="tabpanel"
            aria-labelledby={`lifecycle-tab-${active.id}`}
            className="abx-premium-lifecycle__panel"
            initial={false}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            key={active.id}
          >
            <h3 className="abx-premium-lifecycle__panel-title">{active.title}</h3>
            <p className="abx-premium-lifecycle__panel-body">{active.body}</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
