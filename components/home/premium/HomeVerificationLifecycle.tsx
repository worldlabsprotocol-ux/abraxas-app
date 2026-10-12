"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    body: "You provide verification material once. It stays on the holder side of the boundary.",
    funnel: 100,
  },
  {
    id: "verify",
    label: "Verify",
    title: "Private verification",
    body: "Abraxas evaluates claims without broadcasting raw identity fields to partners.",
    funnel: 78,
  },
  {
    id: "policy",
    label: "Policy",
    title: "Policy evaluation",
    body: "Each request uses a specific policy version. Outcomes do not transfer across policies.",
    funnel: 52,
  },
  {
    id: "receipt",
    label: "Receipt",
    title: "Signed receipt",
    body: "Partners receive a scoped decision — for example PERMIT for 21+ — not underlying documents.",
    funnel: 34,
  },
  {
    id: "independent",
    label: "Verify",
    title: "Independent verification",
    body: "Anyone can check signature, issuer, expiration, and revocation without seeing private evidence.",
    funnel: 22,
  },
];

/** Signature A — narrowing verification lifecycle (replaces generic VPR cards). */
export function HomeVerificationLifecycle() {
  const [stage, setStage] = useState<StageId>("evidence");
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;
    const obs = new IntersectionObserver(
      ([entry]) => setPinned(entry?.isIntersecting ?? false),
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !pinned) return;
    const order = STAGES.map((s) => s.id);
    let i = order.indexOf(stage);
    const t = window.setInterval(() => {
      i = (i + 1) % order.length;
      setStage(order[i]!);
    }, 4800);
    return () => window.clearInterval(t);
  }, [reduceMotion, pinned, stage]);

  const active = STAGES.find((s) => s.id === stage) ?? STAGES[0];
  const select = useCallback((id: StageId) => setStage(id), []);

  return (
    <div ref={ref} id="how-abraxas-works" className="abx-premium-lifecycle">
      <p className="abx-v2-eyebrow">Verification lifecycle</p>
      <h2 id="home-lifecycle-heading" className="abx-v2-section-title abx-premium-lifecycle__title">
        Information narrows at each boundary
      </h2>
      <p className="abx-premium-lifecycle__sim">{CINEMATIC_VPR_SIM_LABEL}</p>

      <div className="abx-premium-lifecycle__layout">
        <div className="abx-premium-lifecycle__funnel" aria-hidden="true">
          <div className="abx-premium-lifecycle__funnel-track">
            <motion.div
              className="abx-premium-lifecycle__funnel-fill"
              animate={{ width: `${active.funnel}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="abx-premium-lifecycle__boundary">
            <span>Relying party boundary</span>
          </div>
          <div className="abx-premium-lifecycle__evidence-packet">
            <span className={stage === "evidence" ? "" : "abx-premium-lifecycle__redacted"}>ID scan</span>
            <span className={stage === "evidence" || stage === "verify" ? "" : "abx-premium-lifecycle__redacted"}>
              Date of birth
            </span>
            <span className={stage === "receipt" || stage === "independent" ? "abx-premium-lifecycle__answer" : "abx-premium-lifecycle__redacted"}>
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
                aria-selected={s.id === stage}
                className={`abx-premium-lifecycle__step${s.id === stage ? " abx-premium-lifecycle__step--active" : ""}`}
                onClick={() => select(s.id)}
              >
                <span className="abx-premium-lifecycle__step-label">{s.label}</span>
              </button>
            ))}
          </div>
          <motion.div
            key={active.id}
            className="abx-premium-lifecycle__panel"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="abx-premium-lifecycle__panel-title">{active.title}</h3>
            <p className="abx-premium-lifecycle__panel-body">{active.body}</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
