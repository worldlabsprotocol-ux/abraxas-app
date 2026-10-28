"use client";
// FILE: components/home/HomeTrustContinuousArchitectureImage.tsx
// Build 886A — stage visual as hero; minimal caption only.

import Image from "next/image";
import { useCallback, useId, useState } from "react";
import {
  TRUST_ARCHITECTURE_OVERVIEW,
  TRUST_ARCHITECTURE_SECTION_LEAD,
  TRUST_ARCHITECTURE_STAGES,
  type TrustArchitectureStageId,
} from "@/lib/home/trustArchitectureStages";

export function HomeTrustContinuousArchitectureImage({ priority = false }: { priority?: boolean }) {
  const captionRegionId = useId();
  const [activeStageId, setActiveStageId] = useState<TrustArchitectureStageId>("request");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const activeStage = TRUST_ARCHITECTURE_STAGES.find((s) => s.id === activeStageId) ?? TRUST_ARCHITECTURE_STAGES[0];

  const selectStage = useCallback((id: TrustArchitectureStageId) => {
    setActiveStageId(id);
    setOverviewOpen(false);
  }, []);

  return (
    <figure className="abx-trust-continuous-arch" aria-labelledby="abx-trust-continuous-arch-title">
      <figcaption className="abx-trust-continuous-arch__caption">
        <p className="abx-v2-eyebrow">02 · How Abraxas works</p>
        <h2 id="abx-trust-continuous-arch-title" className="abx-trust-continuous-arch__title">
          Trust is continuous.
        </h2>
        <p className="abx-trust-continuous-arch__lead">{TRUST_ARCHITECTURE_SECTION_LEAD}</p>
      </figcaption>

      <nav className="abx-trust-continuous-arch__stage-nav" aria-label="Architecture stages">
        <ol className="abx-trust-continuous-arch__stage-list">
          {TRUST_ARCHITECTURE_STAGES.map((stage) => {
            const selected = stage.id === activeStageId && !overviewOpen;
            return (
              <li key={stage.id}>
                <button
                  type="button"
                  className={`abx-trust-continuous-arch__stage-btn${selected ? " abx-trust-continuous-arch__stage-btn--active" : ""}`}
                  aria-current={selected ? "step" : undefined}
                  aria-controls={captionRegionId}
                  onClick={() => selectStage(stage.id)}
                >
                  <span className="abx-trust-continuous-arch__stage-index">{stage.index}</span>
                  <span className="abx-trust-continuous-arch__stage-label">{stage.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <p
        id={captionRegionId}
        className="abx-trust-continuous-arch__stage-caption"
        aria-live="polite"
        aria-atomic="true"
      >
        {activeStage.caption}
      </p>

      {overviewOpen ? (
        <div className="abx-trust-continuous-arch__overview-wrap">
          <Image
            src={TRUST_ARCHITECTURE_OVERVIEW.src}
            alt={TRUST_ARCHITECTURE_OVERVIEW.alt}
            width={TRUST_ARCHITECTURE_OVERVIEW.width}
            height={TRUST_ARCHITECTURE_OVERVIEW.height}
            className="abx-trust-continuous-arch__overview-image"
            priority={priority}
            sizes="(max-width: 768px) 100vw, min(1180px, 96vw)"
          />
        </div>
      ) : (
        <div
          className="abx-trust-continuous-arch__stage-visual"
          key={activeStage.id}
          aria-label={`Architecture visual for stage ${activeStage.index}`}
        >
          <Image
            src={activeStage.visualSrc}
            alt={activeStage.visualAlt}
            width={activeStage.visualWidth}
            height={activeStage.visualHeight}
            className="abx-trust-continuous-arch__stage-image"
            priority={priority && activeStage.id === "request"}
            sizes="(max-width: 768px) 100vw, min(1180px, 96vw)"
          />
        </div>
      )}

      <div className="abx-trust-continuous-arch__diagram-controls">
        <button
          type="button"
          className="abx-trust-continuous-arch__diagram-toggle"
          aria-expanded={overviewOpen}
          onClick={() => setOverviewOpen((v) => !v)}
        >
          {overviewOpen ? "Hide full architecture" : "View full architecture"}
        </button>
      </div>
    </figure>
  );
}
