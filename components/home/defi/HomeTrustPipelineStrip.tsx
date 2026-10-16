"use client";
// FILE: components/home/defi/HomeTrustPipelineStrip.tsx
// Protocol storytelling strip — informational overview (not interactive controls).

import { useEffect, useState } from "react";
import { DEFI_TRUST_PIPELINE } from "@/lib/home/defiVisualHomeCopy";

export function HomeTrustPipelineStrip() {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <section
      className={`abx-trust-pipeline${reduceMotion ? " abx-trust-pipeline--static" : ""}`}
      aria-label="Independent verification flow overview"
    >
      <p className="abx-trust-pipeline__caption">How independent verification composes</p>
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
        <ol className="abx-trust-pipeline__nodes">
          {DEFI_TRUST_PIPELINE.map((step, index) => (
            <li key={step.id} className="abx-trust-pipeline__node">
              <div className="abx-trust-pipeline__node-card">
                <span className="abx-trust-pipeline__node-ring" aria-hidden="true">
                  <span className="abx-trust-pipeline__node-core">{index + 1}</span>
                </span>
                <span className="abx-trust-pipeline__node-copy">
                  <span className="abx-trust-pipeline__node-label">{step.label}</span>
                  <span className="abx-trust-pipeline__node-short">{step.short}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
