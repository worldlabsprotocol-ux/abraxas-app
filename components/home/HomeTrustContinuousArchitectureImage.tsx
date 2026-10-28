"use client";
// FILE: components/home/HomeTrustContinuousArchitectureImage.tsx
// Canonical "Trust is continuous" architecture — stage navigator + responsive diagram.

import Image from "next/image";
import { useCallback, useState } from "react";
import { TRUST_ARCHITECTURE_STAGES, type TrustArchitectureStageId } from "@/lib/home/trustArchitectureStages";

const ARCHITECTURE_SRC = "/home/abraxas-trust-is-continuous-architecture.png";

export function HomeTrustContinuousArchitectureImage({ priority = false }: { priority?: boolean }) {
  const [activeStageId, setActiveStageId] = useState<TrustArchitectureStageId>("request");
  const [diagramExpanded, setDiagramExpanded] = useState(false);
  const activeStage = TRUST_ARCHITECTURE_STAGES.find((s) => s.id === activeStageId) ?? TRUST_ARCHITECTURE_STAGES[0];

  const selectStage = useCallback((id: TrustArchitectureStageId) => {
    setActiveStageId(id);
  }, []);

  const scrollClassName = [
    "abx-trust-continuous-arch__scroll",
    diagramExpanded ? "abx-trust-continuous-arch__scroll--expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure className="abx-trust-continuous-arch" aria-labelledby="abx-trust-continuous-arch-title">
      <figcaption className="abx-trust-continuous-arch__caption">
        <p className="abx-v2-eyebrow">02 · How Abraxas works</p>
        <h2 id="abx-trust-continuous-arch-title" className="abx-trust-continuous-arch__title">
          Trust is continuous.
        </h2>
        <p className="abx-trust-continuous-arch__lead">
          Four stages from request to enforcement—authority and continuity apply in every step. Abraxas does not replace
          your custody or access-control systems.
        </p>
      </figcaption>

      <nav className="abx-trust-continuous-arch__stage-nav" aria-label="Architecture stages">
        <ol className="abx-trust-continuous-arch__stage-list">
          {TRUST_ARCHITECTURE_STAGES.map((stage) => {
            const selected = stage.id === activeStageId;
            return (
              <li key={stage.id}>
                <button
                  type="button"
                  className={`abx-trust-continuous-arch__stage-btn${selected ? " abx-trust-continuous-arch__stage-btn--active" : ""}`}
                  aria-current={selected ? "step" : undefined}
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

      <div className="abx-trust-continuous-arch__stage-panel" aria-live="polite">
        <p className="abx-trust-continuous-arch__stage-question">{activeStage.question}</p>
        <p className="abx-trust-continuous-arch__stage-summary">{activeStage.summary}</p>
        <p className="abx-trust-continuous-arch__stage-continuity">
          <span className="abx-trust-continuous-arch__stage-continuity-label">Continuity:</span> {activeStage.continuity}
        </p>
      </div>

      <div className="abx-trust-continuous-arch__diagram-controls">
        <button
          type="button"
          className="abx-trust-continuous-arch__diagram-toggle"
          aria-expanded={diagramExpanded}
          onClick={() => setDiagramExpanded((v) => !v)}
        >
          {diagramExpanded ? "Hide full diagram" : "View full architecture diagram"}
        </button>
        <p className="abx-trust-continuous-arch__diagram-hint">
          Stages 01–04 are always available above. On larger screens the full diagram is shown; swipe horizontally inside
          the diagram when needed.
        </p>
      </div>

      <div className={scrollClassName}>
        <Image
          src={ARCHITECTURE_SRC}
          alt="Abraxas trust architecture: request, Abraxas decision with authority, independent verification, application enforcement, and continuity across stages."
          width={2400}
          height={1350}
          className="abx-trust-continuous-arch__image"
          priority={priority}
          sizes="(max-width: 768px) 120vw, 1180px"
        />
      </div>
    </figure>
  );
}
