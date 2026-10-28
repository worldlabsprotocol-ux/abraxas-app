"use client";
// FILE: components/home/HomeTrustContinuousArchitectureImage.tsx
// Build 884 — one selected stage visual + HTML panel; full overview on demand.

import Image from "next/image";
import { useCallback, useId, useState } from "react";
import {
  TRUST_ARCHITECTURE_OVERVIEW,
  TRUST_ARCHITECTURE_STAGES,
  type TrustArchitectureStageId,
} from "@/lib/home/trustArchitectureStages";

export function HomeTrustContinuousArchitectureImage({ priority = false }: { priority?: boolean }) {
  const panelId = useId();
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
        <p className="abx-trust-continuous-arch__lead">
          Policy-bound trust decisions with evidence, authority, and continuity at every step—not wallet possession
          alone.
        </p>
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
                  aria-controls={panelId}
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

      <div
        id={panelId}
        className="abx-trust-continuous-arch__stage-panel"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="abx-trust-continuous-arch__stage-summary">{activeStage.summary}</p>
        <ul className="abx-trust-continuous-arch__stage-points">
          {activeStage.panelPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="abx-trust-continuous-arch__stage-continuity">
          <span className="abx-trust-continuous-arch__stage-continuity-label">Continuity:</span> {activeStage.continuity}
        </p>
      </div>

      <div className="abx-trust-continuous-arch__diagram-controls">
        <button
          type="button"
          className="abx-trust-continuous-arch__diagram-toggle"
          aria-expanded={overviewOpen}
          onClick={() => setOverviewOpen((v) => !v)}
        >
          {overviewOpen ? "Hide full architecture" : "View full architecture"}
        </button>
        <p className="abx-trust-continuous-arch__diagram-hint">
          Select stages 01–04 to update the visual and explanation together. Open the full overview when you need all
          stages in one view.
        </p>
      </div>

      {overviewOpen ? (
        <div className="abx-trust-continuous-arch__overview-wrap">
          <Image
            src={TRUST_ARCHITECTURE_OVERVIEW.src}
            alt={TRUST_ARCHITECTURE_OVERVIEW.alt}
            width={TRUST_ARCHITECTURE_OVERVIEW.width}
            height={TRUST_ARCHITECTURE_OVERVIEW.height}
            className="abx-trust-continuous-arch__overview-image"
            priority={priority}
            sizes="(max-width: 768px) 100vw, 1180px"
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
            sizes="(max-width: 768px) 100vw, 720px"
          />
        </div>
      )}
    </figure>
  );
}
