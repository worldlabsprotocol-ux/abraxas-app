"use client";
// FILE: components/account/EphemeralSandboxVerificationCompletion.tsx

import Link from "next/link";
import type { EphemeralSandboxCompletionView } from "@/lib/developers/ephemeralWorkspaceCompletion";
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

  return (
    <div className={`${styles.completionHero} ${toneClass}`}>
      <p className={styles.completionEyebrow}>{view.statusEyebrow}</p>
      <h3 className={styles.completionHeadline}>{view.headline}</h3>
      <p className={styles.completionSummary}>{view.summary}</p>
      <p className={styles.note}>{view.sandboxOnlyNote}</p>

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

      <div className={styles.completionNext}>
        <p className={styles.completionNextTitle}>What happens next?</p>
        <p className={styles.muted}>
          An application can use this verification result to decide whether to allow a specific action. In
          this sandbox, no live access or eligibility is granted.
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
          <Link className={styles.completionPrimaryLink} href={view.primaryAction.href}>
            {view.primaryAction.label}
            <span aria-hidden className={styles.completionPrimaryArrow}>
              ↗
            </span>
          </Link>
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
