"use client";
// FILE: components/passport/PassportWalkthrough.tsx
// Guided 4-step flow: Create account → Verify identity → Get passport → Reuse anywhere.

import { useEffect, useMemo, useState } from "react";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import type { StoredCredential } from "@/lib/credentials/storage";
import type {
  CredentialVerifyState,
  IdentityStampStatus,
  OnChainPassportStatus,
} from "@/lib/hooks/usePassportVerification";
import {
  computePassportCompletion,
  PASSPORT_FLOW_STEPS,
  resolveFlowStep,
  type ChecklistStatus,
} from "@/lib/passportCompletion";
import { consumerCopy } from "@/lib/consumerCopy";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

type StepId = 1 | 2 | 3 | 4;

function checklistForStep(
  step: StepId,
  items: ReturnType<typeof computePassportCompletion>["items"],
): ChecklistStatus {
  const item = items.find(i => i.step === step);
  return item?.status ?? "not_started";
}

export function PassportWalkthrough({
  walletDone,
  suiAddress,
  email,
  identityStatus,
  credential,
  verifyState,
  isPolling,
  isRefreshing,
  starting,
  error,
  onStartIdCheck,
  onRefresh,
  onChain,
  intentProofs = 0,
  stamps,
}: {
  walletDone: boolean;
  suiAddress: string | null;
  email: string;
  identityStatus: IdentityStampStatus;
  credential: StoredCredential | null;
  verifyState: CredentialVerifyState;
  isPolling: boolean;
  isRefreshing: boolean;
  starting: boolean;
  error: string | null;
  onStartIdCheck: () => void;
  onRefresh: () => void;
  onChain?: OnChainPassportStatus | null;
  intentProofs?: number;
  stamps?: {
    identity: "earned" | "in_progress" | "not_started";
    business: "earned" | "in_progress" | "not_started";
    asset_owner: "earned" | "in_progress" | "not_started";
  };
}) {
  const hasCredential = Boolean(credential) && identityStatus === "earned";

  const completion = useMemo(
    () =>
      computePassportCompletion({
        walletDone,
        identityStatus,
        credentialActive: hasCredential,
        verifyState,
        onChain: onChain ?? null,
        intentProofs,
        stamps: stamps ?? {
          identity: identityStatus === "earned" ? "earned" : identityStatus === "pending" ? "in_progress" : "not_started",
          business: "not_started",
          asset_owner: "not_started",
        },
      }),
    [walletDone, identityStatus, hasCredential, verifyState, onChain, intentProofs, stamps],
  );

  const currentStep = resolveFlowStep(completion);
  const [expanded, setExpanded] = useState<StepId>(currentStep);
  const [copied, setCopied] = useState<"jwt" | "wallet" | null>(null);

  useEffect(() => {
    setExpanded(currentStep);
  }, [currentStep]);

  async function copyText(text: string, kind: "jwt" | "wallet") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  const verifyWalletUrl = suiAddress
    ? `/api/credentials/verify?wallet=${encodeURIComponent(suiAddress)}`
    : null;

  const stepCopy = consumerCopy.passport.flowSteps;

  return (
    <section aria-label="Passport onboarding walkthrough" style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <div style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.4rem",
          }}>
            {consumerCopy.passport.walkthroughEyebrow}
          </div>
          <h2 style={{
            fontFamily: FONT, fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", fontWeight: 800,
            letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0,
          }}>
            {consumerCopy.passport.walkthroughTitle}
          </h2>
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
          Step {currentStep} of 4 · {completion.percent}% complete
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={completion.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
        style={{ height: 4, borderRadius: 999, background: "var(--border)", marginBottom: "1rem", overflow: "hidden" }}
      >
        <div style={{
          height: "100%", width: `${completion.percent}%`, borderRadius: 999,
          background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}cc)`,
          transition: "width 0.45s ease",
        }} />
      </div>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {PASSPORT_FLOW_STEPS.map(step => {
          const status = checklistForStep(step.id, completion.items);
          const isOpen = expanded === step.id;
          const isDone = status === "verified";
          const isReview = status === "pending";
          const isLocked = status === "not_started" && step.id > 1 && !walletDone;

          const borderColor = isDone ? `${ACCENT}55` : isOpen ? `${ACCENT}66` : "var(--border)";
          const panelId = `passport-step-panel-${step.id}`;

          return (
            <li
              key={step.id}
              style={{
                borderRadius: 14, border: `1px solid ${borderColor}`,
                background: isDone ? `${ACCENT}08` : isOpen ? "var(--surface-raised)" : "var(--surface)",
                overflow: "hidden", opacity: isLocked ? 0.72 : 1,
              }}
            >
              <button
                type="button"
                id={`passport-step-${step.id}`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => !isLocked && setExpanded(step.id)}
                disabled={isLocked}
                className="abx-interactive"
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "0.85rem",
                  padding: "1rem 1.15rem", border: "none", background: "transparent",
                  cursor: isLocked ? "default" : "pointer", textAlign: "left",
                  minHeight: 56,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isDone ? ACCENT : isReview ? "rgba(245,158,11,0.15)" : isOpen ? `${ACCENT}18` : "var(--surface-raised)",
                  border: `1.5px solid ${isDone ? ACCENT : isReview ? "#F59E0B" : isOpen ? `${ACCENT}55` : "var(--border)"}`,
                  fontFamily: MONO, fontSize: "0.72rem", fontWeight: 800,
                  color: isDone ? "#000" : isReview ? "#F59E0B" : isOpen ? ACCENT : "var(--text-muted)",
                }}>
                  {isDone ? "✓" : step.id}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.15rem" }}>
                    <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {step.label}
                    </span>
                    <span style={{
                      fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      padding: "0.15rem 0.45rem", borderRadius: 999,
                      color: isDone ? ACCENT : isReview ? "#F59E0B" : "var(--text-muted)",
                      border: `1px solid ${isDone ? `${ACCENT}44` : isReview ? "rgba(245,158,11,0.35)" : "var(--border)"}`,
                    }}>
                      {isDone ? "Complete" : isReview ? "In review" : step.id === 2 ? "Optional" : status === "optional" ? "Optional" : step.id === currentStep ? "Current" : "Up next"}
                    </span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {stepCopy[step.id - 1]?.subtitle ?? step.sub}
                  </div>
                </div>

                {!isLocked && (
                  <span aria-hidden style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0 }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                )}
              </button>

              {isOpen && (
                <div id={panelId} role="region" aria-labelledby={`passport-step-${step.id}`}
                  style={{ padding: "0 1.15rem 1.15rem", borderTop: "1px solid var(--border)" }}>
                  {step.id === 1 && (
                    <div style={{ paddingTop: "1rem" }}>
                      {!walletDone ? (
                        <>
                          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
                            {consumerCopy.passport.walletHint}
                          </p>
                          <ZkLoginSignIn />
                        </>
                      ) : (
                        <StatusBanner tone="success" title="Account created">
                          {email && <>Signed in as <strong>{email}</strong>. </>}
                          {suiAddress && <>Wallet {truncateSuiAddress(suiAddress, 10, 8)} ready.</>}
                          {" "}Browse assets now — ID check is optional until a deal needs it.
                        </StatusBanner>
                      )}
                    </div>
                  )}

                  {step.id === 2 && (
                    <div style={{ paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      {identityStatus === "pending" || isPolling ? (
                        <StatusBanner
                          tone="pending"
                          title="Identity verification in review"
                          loading={isPolling}
                          action={
                            <Btn variant="secondary" size="sm" loading={isRefreshing} onClick={onRefresh}>
                              Check status now
                            </Btn>
                          }
                        >
                          Documents are being reviewed. This page polls automatically and issues your passport when approved.
                        </StatusBanner>
                      ) : identityStatus === "declined" ? (
                        <StatusBanner tone="error" title="Verification not approved">
                          Try again below or upload your ID for manual review in the stamps section.
                        </StatusBanner>
                      ) : !hasCredential ? (
                        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                          {consumerCopy.passport.precheckProvider}
                        </p>
                      ) : (
                        <StatusBanner tone="success" title="Identity verified">
                          Your ID check is complete. Passport credential issued in step 3.
                        </StatusBanner>
                      )}

                      {!hasCredential && identityStatus !== "pending" && !isPolling && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                          <Btn onClick={onStartIdCheck} disabled={!walletDone} loading={starting}>
                            {consumerCopy.passport.precheck} →
                          </Btn>
                          {walletDone && (
                            <Btn href="/" variant="tertiary" size="md">
                              Skip — browse assets
                            </Btn>
                          )}
                        </div>
                      )}

                      {error && (
                        <StatusBanner tone="error" title="Could not start ID check">
                          {error}
                        </StatusBanner>
                      )}
                    </div>
                  )}

                  {step.id === 3 && (
                    <div style={{ paddingTop: "1rem" }}>
                      {hasCredential && credential ? (
                        <StatusBanner tone="success" title="Passport issued">
                          Level {credential.level.toUpperCase()} credential · expires {new Date(credential.expires_at).toLocaleDateString()}.
                          {verifyState === "valid" && " Cryptographically verified."}
                          {" "}Full details appear in the credential banner below.
                        </StatusBanner>
                      ) : identityStatus === "pending" || isPolling ? (
                        <StatusBanner tone="pending" title="Passport pending approval" loading>
                          Your credential will be issued automatically once ID review completes.
                        </StatusBanner>
                      ) : (
                        <StatusBanner tone="info" title="Unlocked after identity verification">
                          Complete step 2 to receive your signed W3C passport credential.
                          {walletDone && (
                            <div style={{ marginTop: "0.75rem" }}>
                              <Btn variant="secondary" size="sm" onClick={() => setExpanded(2)}>
                                Go to identity check
                              </Btn>
                            </div>
                          )}
                        </StatusBanner>
                      )}
                    </div>
                  )}

                  {step.id === 4 && (
                    <div style={{ paddingTop: "1rem" }}>
                      {hasCredential && credential ? (
                        <>
                          <StatusBanner
                            tone={verifyState === "valid" ? "success" : "pending"}
                            title={verifyState === "valid" ? "Ready to reuse anywhere" : "Share your verify link"}
                          >
                            Partners verify via API — they never see your documents. Copy your JWT or open the public verify link.
                          </StatusBanner>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
                            {verifyWalletUrl && (
                              <Btn href={verifyWalletUrl} newTab size="sm">
                                Open verify link ↗
                              </Btn>
                            )}
                            <Btn href="/verify" variant="secondary" size="sm">
                              Public verifier
                            </Btn>
                            <Btn variant="tertiary" size="sm" onClick={() => copyText(credential.jwt, "jwt")}>
                              {copied === "jwt" ? "✓ Copied JWT" : "Copy JWT"}
                            </Btn>
                            {suiAddress && (
                              <Btn variant="tertiary" size="sm" onClick={() => copyText(suiAddress, "wallet")}>
                                {copied === "wallet" ? "✓ Copied wallet" : "Copy wallet"}
                              </Btn>
                            )}
                          </div>
                        </>
                      ) : (
                        <StatusBanner tone="info" title="Reuse anywhere">
                          Once your passport is issued, you&apos;ll get a verify link and JWT to share with any partner protocol.
                        </StatusBanner>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
