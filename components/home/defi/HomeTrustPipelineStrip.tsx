"use client";
// FILE: components/home/defi/HomeTrustPipelineStrip.tsx
// Selectable verification-flow overview — each stage reveals accurate illustrative detail.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  DEFI_TRUST_PIPELINE,
  TRUST_PIPELINE_STAGE_DETAIL,
  type TrustPipelineStageId,
} from "@/lib/home/defiVisualHomeCopy";

const STAGE_ORDER = DEFI_TRUST_PIPELINE.map((s) => s.id);

export function HomeTrustPipelineStrip() {
  const [activeId, setActiveId] = useState<TrustPipelineStageId>("issuer");
  const [reduceMotion, setReduceMotion] = useState(true);
  const panelId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const activeIndex = STAGE_ORDER.indexOf(activeId);
  const activeStep = DEFI_TRUST_PIPELINE[activeIndex] ?? DEFI_TRUST_PIPELINE[0];
  const activeDetail = TRUST_PIPELINE_STAGE_DETAIL[activeStep.id];

  const focusStage = useCallback((index: number, moveFocus = false) => {
    const next = STAGE_ORDER[index];
    if (!next) return;
    setActiveId(next);
    if (moveFocus) {
      requestAnimationFrame(() => tabRefs.current[index]?.focus());
    }
  }, []);

  const onTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        focusStage((index + 1) % STAGE_ORDER.length, true);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        focusStage((index - 1 + STAGE_ORDER.length) % STAGE_ORDER.length, true);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusStage(0, true);
      } else if (event.key === "End") {
        event.preventDefault();
        focusStage(STAGE_ORDER.length - 1, true);
      }
    },
    [focusStage],
  );

  return (
    <section
      className={`abx-trust-pipeline${reduceMotion ? " abx-trust-pipeline--static" : ""}`}
      aria-label="Independent verification flow overview"
    >
      <p className="abx-trust-pipeline__caption">Verification composition</p>
      <div className="abx-trust-pipeline__diagram">
        <svg className="abx-trust-pipeline__lines" viewBox="0 0 920 48" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="abx-pipeline-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(76, 187, 146, 0.05)" />
              <stop offset="50%" stopColor="rgba(76, 187, 146, 0.45)" />
              <stop offset="100%" stopColor="rgba(76, 187, 146, 0.05)" />
            </linearGradient>
          </defs>
          <path
            className="abx-trust-pipeline__path"
            d="M 80 24 H 840"
            fill="none"
            stroke="url(#abx-pipeline-line)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <ol className="abx-trust-pipeline__nodes" role="tablist" aria-label="Verification stages">
          {DEFI_TRUST_PIPELINE.map((step, index) => {
            const selected = step.id === activeId;
            return (
              <li key={step.id} className="abx-trust-pipeline__node" role="presentation">
                <button
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`abx-pipeline-tab-${step.id}`}
                  className={`abx-trust-pipeline__node-tab${selected ? " abx-trust-pipeline__node-tab--active" : ""}`}
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveId(step.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  <span className="abx-trust-pipeline__node-ring" aria-hidden="true">
                    <span className="abx-trust-pipeline__node-core">{index + 1}</span>
                  </span>
                  <span className="abx-trust-pipeline__node-copy">
                    <span className="abx-trust-pipeline__node-label">{step.label}</span>
                    <span className="abx-trust-pipeline__node-short">{step.short}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        className="abx-trust-pipeline__panel"
        aria-labelledby={`abx-pipeline-tab-${activeStep.id}`}
      >
        <div className={`abx-trust-pipeline__viz abx-trust-pipeline__viz--${activeStep.id}`} aria-hidden="true">
          <span className="abx-trust-pipeline__viz-chip">{activeDetail.vizLabel}</span>
          <div className="abx-trust-pipeline__viz-graph">
            <span className="abx-trust-pipeline__viz-node abx-trust-pipeline__viz-node--a" />
            <span className="abx-trust-pipeline__viz-connector" />
            <span className="abx-trust-pipeline__viz-node abx-trust-pipeline__viz-node--b" />
          </div>
        </div>
        <div className="abx-trust-pipeline__panel-copy">
          <h3 className="abx-trust-pipeline__panel-title">{activeDetail.headline}</h3>
          <p className="abx-trust-pipeline__panel-body">{activeDetail.body}</p>
        </div>
      </div>
    </section>
  );
}
