"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { CINEMATIC_VPR_SIM_LABEL } from "@/lib/home/cinematicHomeCopy";

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
    body: "Partners receive a signed decision receipt — for example PERMIT for age_over_18 — not underlying identity fields.",
  },
  {
    id: "verify",
    index: "04",
    tab: "Independent verification",
    kicker: "Relying party verification",
    title: "Verify without a trusted middleman",
    body: "Applications, services, and partners verify signature, policy binding, freshness, and revocation independently.",
  },
];

const EVIDENCE = [
  "Identity data",
  "Credentials",
  "Records",
  "Biometrics",
  "Device signals",
  "Additional evidence",
] as const;

const BOUNDARY_STEPS = [
  { title: "Evidence processing", detail: "Normalize · validate · keep private" },
  { title: "Policy evaluation", detail: "Apply rules · check eligibility" },
  { title: "Sign decision", detail: "Scope to policy · cryptographic proof" },
] as const;

const RELIERS = ["Applications", "Services", "Partners", "Third parties"] as const;

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

  const showBoundary = stage === "evaluate" || stage === "decision" || stage === "verify";
  const showReceipt = stage === "decision" || stage === "verify";
  const showReliers = stage === "verify";
  const evidenceInside = stage !== "verify";

  return (
    <div id="how-abraxas-works" className="abx-vltb">
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
        className="abx-vltb__canvas"
        aria-hidden={false}
        style={
          reduceMotion
            ? undefined
            : ({ ["--vltb-progress" as string]: String(progress) } as CSSProperties)
        }
      >
        <div className="abx-vltb__grid" aria-hidden="true" />
        <div className="abx-vltb__flow-track">
          <span className="abx-vltb__flow-fill" />
        </div>

        <div className="abx-vltb__columns">
          <div className={`abx-vltb__col abx-vltb__col--evidence${evidenceInside ? "" : " abx-vltb__col--muted"}`}>
            <p className="abx-vltb__col-kicker">Private evidence</p>
            <ul className="abx-vltb__evidence-list">
              {EVIDENCE.map((label) => (
                <li key={label} className="abx-vltb__evidence-item">
                  <span className="abx-vltb__evidence-dot" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <p className="abx-vltb__boundary-note">
              {evidenceInside ? "Inside protected domain" : "Not shared with relying parties"}
            </p>
          </div>

          <div className={`abx-vltb__boundary${showBoundary ? " abx-vltb__boundary--on" : ""}`}>
            <p className="abx-vltb__boundary-title">
              <span className="abx-vltb__lock" aria-hidden="true">
                ◆
              </span>
              Abraxas verification boundary
            </p>
            <ul className="abx-vltb__boundary-steps">
              {BOUNDARY_STEPS.map((step, i) => {
                const lit = stage === "evaluate" || (stage === "decision" && i <= 2) || stage === "verify";
                return (
                  <li
                    key={step.title}
                    className={`abx-vltb__boundary-step${lit ? " abx-vltb__boundary-step--lit" : ""}`}
                  >
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </li>
                );
              })}
            </ul>
            <p className="abx-vltb__boundary-footer">Private data does not leave the boundary</p>
          </div>

          <div className={`abx-vltb__col abx-vltb__col--output${showReceipt ? "" : " abx-vltb__col--muted"}`}>
            <p className="abx-vltb__col-kicker">Scoped signed decision</p>
            <div className="abx-vltb__receipt">
              <p className="abx-vltb__receipt-title">Verification receipt</p>
              <ul className="abx-vltb__receipt-lines">
                <li>
                  <span>Result</span>
                  <code>{showReceipt ? "ALLOW" : "—"}</code>
                </li>
                <li>
                  <span>Policy</span>
                  <code>{showReceipt ? "age_over_18" : "—"}</code>
                </li>
                <li>
                  <span>Issuer</span>
                  <code>{showReceipt ? "Abraxas" : "—"}</code>
                </li>
              </ul>
            </div>
            {showReliers ? (
              <ul className="abx-vltb__reliers">
                {RELIERS.map((name) => (
                  <li key={name}>
                    <strong>{name}</strong>
                    <span>Verify independently</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="abx-vltb__receipt-hint">Permitted decision only — no raw evidence</p>
            )}
          </div>
        </div>
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
