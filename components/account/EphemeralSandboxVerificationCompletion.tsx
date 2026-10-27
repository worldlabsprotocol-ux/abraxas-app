"use client";
// FILE: components/account/EphemeralSandboxVerificationCompletion.tsx

import Link from "next/link";
import type { EphemeralSandboxCompletionView } from "@/lib/developers/ephemeralWorkspaceCompletion";
import {
  GUIDED_INTEGRATION_JOURNEY,
  guidedJourneyProgressLabel,
} from "@/lib/developers/guidedIntegrationJourney";
import styles from "./EphemeralDeveloperWorkspace.module.css";

function ChecklistIcon({ state }: { state: "done" | "next" | "pending" | "blocked" }) {
  if (state === "done") return <span aria-hidden>✓</span>;
  if (state === "next") return <span aria-hidden>→</span>;
  if (state === "blocked") return <span aria-hidden>!</span>;
  return <span aria-hidden>○</span>;
}

export function EphemeralSandboxVerificationCompletion({
  view,
}: {
  view: EphemeralSandboxCompletionView;
}) {
  const toneClass =
    view.tone === "success"
      ? styles.completionSuccess
      : view.tone === "caution" || view.tone === "error"
        ? styles.completionCaution
        : styles.completionNeutral;

  const journeyStep = view.primaryAction?.label === "Build my test app" ? 2 : 1;
  const journeyLabel = GUIDED_INTEGRATION_JOURNEY[journeyStep - 1]?.title ?? "Prove wallet control";

  return (
    <div className={`${styles.completionHero} ${toneClass}`}>
      <p className={styles.journeyKicker}>
        Abraxas · Your first integration · {guidedJourneyProgressLabel(journeyStep)}
      </p>
      <p className={styles.completionEyebrow}>{view.statusEyebrow}</p>
      <h3 className={styles.completionHeadline}>{view.headline}</h3>
      <p className={styles.completionSummary}>{view.summary}</p>
      <p className={styles.note}>{view.sandboxOnlyNote}</p>

      <details className={styles.completionDetailsCollapsible}>
        <summary>Technical details</summary>
      <div className={styles.completionDetails}>
        <p className={styles.resultLine}>
          <strong>What was verified:</strong> {view.whatVerified}
        </p>
        <p className={styles.resultLine}>
          <strong>{view.policyLine}</strong>
        </p>
        <p className={styles.resultLine}>{view.decisionLine}</p>
        <p className={styles.resultLine}>{view.acceptabilityLine}</p>
        <p className={styles.resultLine}>
          <strong>Receipt:</strong> {view.receiptRepresents}
        </p>
        <p className={styles.muted}>{view.receiptUseLine}</p>
        {view.validationModeLine ? <p className={styles.muted}>{view.validationModeLine}</p> : null}
      </div>
      </details>

      {view.applicationHandoff ? (
        <div className={styles.integrationHandoff}>
          <p className={styles.completionNextTitle}>{view.applicationHandoff.title}</p>
          <p className={styles.muted}>{view.applicationHandoff.summary}</p>
          <ol className={styles.integrationHandoffSteps}>
            {view.applicationHandoff.steps.map((step) => (
              <li key={step.id} data-state={step.state}>
                <span className={styles.integrationHandoffStepLabel}>{step.label}</span>
                <span className={styles.muted}>{step.detail}</span>
              </li>
            ))}
          </ol>
          <Link className={styles.completionSecondaryLink} href={view.applicationHandoff.studioHref}>
            Continue application setup in this workspace
          </Link>
        </div>
      ) : null}

      <div className={styles.completionNext}>
        <p className={styles.completionNextTitle}>
          {view.primaryAction?.label === "Build my test app"
            ? "Your wallet is verified. Now see how Abraxas works in your app."
            : "What happens next?"}
        </p>
        <p className={styles.muted}>
          {view.primaryAction?.label === "Build my test app"
            ? "Create a test application here to request verification and enforce the signed result in your own code — separate from your wallet demonstration."
            : "An application can use this verification result to decide whether to allow a specific action. In this sandbox, no live access or eligibility is granted."}
        </p>
        <p className={styles.journeyNextLabel} aria-hidden>
          Next · {journeyLabel}
        </p>
        <ul className={styles.completionChecklist}>
          {view.checklist.map((item) => (
            <li key={item.id} data-state={item.state}>
              <ChecklistIcon state={item.state} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {view.primaryAction ? (
        <div className={styles.completionPrimaryWrap}>
          {view.primaryAction.inPageAnchor ? (
            <a className={styles.completionPrimaryLink} href={view.primaryAction.href}>
              {view.primaryAction.label}
            </a>
          ) : (
            <Link className={styles.completionPrimaryLink} href={view.primaryAction.href}>
              {view.primaryAction.label}
              {view.primaryAction.href.includes("/developers/integration-studio") ? (
                <span aria-hidden className={styles.completionPrimaryArrow}>
                  ↗
                </span>
              ) : null}
            </Link>
          )}
          <p className={styles.muted}>{view.primaryAction.description}</p>
          {view.secondaryAction ? (
            <Link className={styles.completionSecondaryLink} href={view.secondaryAction.href}>
              {view.secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
