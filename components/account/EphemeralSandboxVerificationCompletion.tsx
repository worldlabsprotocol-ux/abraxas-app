"use client";
// FILE: components/account/EphemeralSandboxVerificationCompletion.tsx

import Link from "next/link";
import type { EphemeralSandboxCompletionView } from "@/lib/developers/ephemeralWorkspaceCompletion";
import type { ReceiptValidationUiState } from "@/lib/developers/mapReceiptValidationOutcome";
import { guidedJourneyProgressLabel } from "@/lib/developers/guidedIntegrationJourney";
import { AbraxasProcessingEmblem } from "@/components/brand/AbraxasProcessingEmblem";
import styles from "./EphemeralDeveloperWorkspace.module.css";

export function EphemeralSandboxVerificationCompletion({
  view,
  receiptValidation,
  onCheckProof,
  checkProofBusy,
  receiptId,
  payloadHash,
  onRunAnotherTest,
  onInlineIntegrate,
}: {
  view: EphemeralSandboxCompletionView;
  receiptValidation: ReceiptValidationUiState;
  onCheckProof: () => void;
  checkProofBusy: boolean;
  receiptId: string | null;
  payloadHash: string | null;
  onRunAnotherTest?: () => void;
  onInlineIntegrate?: () => void;
}) {
  const toneClass =
    view.tone === "success"
      ? styles.completionSuccess
      : view.tone === "caution" || view.tone === "error"
        ? styles.completionCaution
        : styles.completionNeutral;

  const journeyStep =
    view.primaryAction?.kind === "link" && view.primaryAction.label === "Connect your application" ? 2 : 1;

  const showProofStage =
    view.primaryAction?.kind === "check_proof" || receiptValidation.status === "checking";

  const showValidatedOutcome =
    receiptValidation.status === "validated" && view.primaryAction?.kind === "link";

  return (
    <div className={`${styles.completionHero} ${toneClass}`} data-testid="sandbox-completion-active-stage">
      <p className={styles.journeyKicker}>
        Abraxas · Your first integration · {guidedJourneyProgressLabel(journeyStep)}
      </p>
      <p className={styles.completionEyebrow}>{view.statusEyebrow}</p>
      <h3 className={styles.completionHeadline}>{view.headline}</h3>
      <p className={styles.completionSummary}>{view.summary}</p>
      <p className={styles.note}>{view.sandboxOnlyNote}</p>

      <div className={styles.validationPanel} aria-live="polite" aria-busy={receiptValidation.status === "checking"}>
        {receiptValidation.status === "checking" ? (
          <div className={styles.statusRow} role="status">
            <AbraxasProcessingEmblem size={28} pulse className={styles.statusEmblem} />
            Checking your proof…
          </div>
        ) : null}
        {receiptValidation.status === "validated" ? (
          <>
            <p className={styles.resultLine}>{view.acceptabilityLine}</p>
            {receiptValidation.verificationSummary ? (
              <p className={styles.note}>{receiptValidation.verificationSummary}</p>
            ) : null}
            <p className={styles.resultLine}>
              <strong>
                {receiptValidation.standaloneCryptographicVerification === false
                  ? "Sandbox integrity verified:"
                  : "Signature authentic:"}
              </strong>{" "}
              {receiptValidation.signatureAuthentic ? "Yes" : "No"}
            </p>
            <p className={styles.resultLine}>
              <strong>Currently acceptable:</strong>{" "}
              {receiptValidation.currentlyAcceptable ? "Yes" : "No"}
            </p>
            {receiptValidation.checkedAt ? (
              <p className={styles.meta}>
                Checked {new Date(receiptValidation.checkedAt).toLocaleString()}
              </p>
            ) : null}
          </>
        ) : null}
        {receiptValidation.status === "failed" ? (
          <div className={styles.errorPanel} role="alert">
            <p className={styles.errorTitle}>{receiptValidation.title}</p>
            <p className={styles.errorMessage}>{receiptValidation.message}</p>
            {receiptValidation.recovery ? (
              <p className={styles.errorRecovery}>{receiptValidation.recovery}</p>
            ) : null}
            <button
              type="button"
              className={styles.linkBtn}
              disabled={checkProofBusy}
              onClick={onCheckProof}
            >
              Try checking your proof again
            </button>
          </div>
        ) : null}
      </div>

      {view.primaryAction ? (
        <div className={styles.completionPrimaryWrap}>
          {view.primaryAction.kind === "check_proof" ? (
            <button
              type="button"
              className={styles.completionPrimaryBtn}
              disabled={checkProofBusy || receiptValidation.status === "checking"}
              onClick={onCheckProof}
            >
              {receiptValidation.status === "checking" ? "Checking your proof…" : view.primaryAction.label}
            </button>
          ) : view.primaryAction.kind === "inline_integrate" ? (
            <button
              type="button"
              className={styles.completionPrimaryBtn}
              onClick={() => onInlineIntegrate?.()}
            >
              {view.primaryAction.label}
            </button>
          ) : (
            <Link className={styles.completionPrimaryLink} href={view.primaryAction.href ?? "#"}>
              {view.primaryAction.label}
            </Link>
          )}
          <p className={styles.muted}>{view.primaryAction.description}</p>
        </div>
      ) : null}


      {showValidatedOutcome && view.secondaryAction ? (
        <Link className={styles.completionSecondaryLink} href={view.secondaryAction.href ?? "#"}>
          {view.secondaryAction.label}
        </Link>
      ) : null}

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
          <p className={styles.resultLine}>
            <strong>Receipt:</strong> {view.receiptRepresents}
          </p>
          <p className={styles.muted}>{view.receiptUseLine}</p>
          {view.validationModeLine ? <p className={styles.muted}>{view.validationModeLine}</p> : null}
          {receiptId ? (
            <p className={styles.mono}>
              {receiptId}
              {payloadHash ? (
                <>
                  <br />
                  {payloadHash}
                </>
              ) : null}
            </p>
          ) : null}
          {onRunAnotherTest ? (
            <button type="button" className={styles.linkBtn} onClick={onRunAnotherTest}>
              Run another test
            </button>
          ) : null}
        </div>
      </details>
    </div>
  );
}
