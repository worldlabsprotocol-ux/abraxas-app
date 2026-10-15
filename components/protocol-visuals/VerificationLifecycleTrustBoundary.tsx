"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { CINEMATIC_VPR_SIM_LABEL } from "@/lib/home/cinematicHomeCopy";
import { HOMEPAGE_PROTOCOL_VISUAL_ASSETS } from "@/lib/home/homepageProtocolVisualAssets";
import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";

type StageId = "provide" | "evaluate" | "decision" | "verify";

const STAGES: {
  id: StageId;
  index: string;
  tab: string;
  kicker: string;
  title: string;
  body: string;
}[] = [
  {
    id: "provide",
    index: "01",
    tab: "Provide evidence",
    kicker: "Private evidence",
    title: "Evidence stays on your side of the boundary",
    body: "Identity material enters only with consent. Raw documents and biometrics remain inside the protected holder domain.",
  },
  {
    id: "evaluate",
    index: "02",
    tab: "Policy evaluation",
    kicker: "Abraxas verification boundary",
    title: "Rules run inside a secure boundary",
    body: "Evidence is normalized and validated privately, evaluated against the requesting policy, and reduced to an eligibility result.",
  },
  {
    id: "decision",
    index: "03",
    tab: "Scoped decision",
    kicker: "Scoped signed decision",
    title: "Only the minimum necessary leaves",
    body: "Partners receive a signed decision receipt, for example PERMIT for age_over_18, not underlying identity fields.",
  },
  {
    id: "verify",
    index: "04",
    tab: "Independent verification",
    kicker: "Relying party verification",
    title: "Verify without Abraxas identity databases",
    body: "Relying parties verify signature, policy binding, freshness, and authenticated portable revocation using locally trusted issuer keys. Verification fails closed when state is stale or untrusted.",
  },
];

function stageProgress(id: StageId): number {
  const order: StageId[] = ["provide", "evaluate", "decision", "verify"];
  return (order.indexOf(id) + 1) / order.length;
}

export function VerificationLifecycleTrustBoundary() {
  const [stage, setStage] = useState<StageId>("provide");
  const reduceMotion = useReducedMotion();
  const active = STAGES.find((s) => s.id === stage) ?? STAGES[0];
  const progress = stageProgress(stage);
  const select = useCallback((id: StageId) => setStage(id), []);

  return (
    <div id="verification-lifecycle-trust-boundary" className="abx-vltb">
      <p className="abx-v2-eyebrow">Verification lifecycle</p>
      <h2 id="home-lifecycle-heading" className="abx-v2-section-title abx-vltb__title">
        Information <span className="abx-vltb__accent">narrows</span> at each boundary
      </h2>
      <p className="abx-vltb__lead">
        Private evidence enters a secure boundary. It is evaluated against policy, a scoped signed decision is issued,
        and third parties can verify it independently.
      </p>
      <p className="abx-vltb__sim" role="note">
        {CINEMATIC_VPR_SIM_LABEL}
      </p>

      <div className="abx-vltb__stepper" role="tablist" aria-label="Verification lifecycle stages">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`vltb-tab-${s.id}`}
            aria-selected={s.id === stage}
            aria-controls="vltb-panel"
            className={`abx-vltb__step${s.id === stage ? " abx-vltb__step--active" : ""}`}
            onClick={() => select(s.id)}
          >
            <span className="abx-vltb__step-index">{s.index}</span>
            <span className="abx-vltb__step-label">{s.tab}</span>
          </button>
        ))}
      </div>

      <div
        className="abx-vltb__canvas abx-vltb__canvas--reference"
        style={
          reduceMotion
            ? undefined
            : ({ ["--vltb-progress" as string]: String(progress) } as CSSProperties)
        }
      >
        <div className="abx-vltb__flow-track" aria-hidden="true">
          <span className="abx-vltb__flow-fill" />
        </div>
        <div className={`abx-vltb__stage-glow abx-vltb__stage-glow--${stage}`} aria-hidden="true" />
        <ProtocolDiagramFigure
          src={HOMEPAGE_PROTOCOL_VISUAL_ASSETS.verificationLifecycle}
          alt="Private evidence flows through the Abraxas verification boundary into a scoped signed decision that relying parties verify independently."
          width={1920}
          height={1080}
          decorative
        />
      </div>

      <div
        id="vltb-panel"
        role="tabpanel"
        aria-labelledby={`vltb-tab-${active.id}`}
        className="abx-vltb__panel"
      >
        <p className="abx-vltb__panel-kicker">{active.kicker}</p>
        <h3 className="abx-vltb__panel-title">{active.title}</h3>
        <p className="abx-vltb__panel-body">{active.body}</p>
      </div>
    </div>
  );
}
