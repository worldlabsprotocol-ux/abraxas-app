"use client";
// FILE: components/passport/PassportWalkthrough.tsx
// Guided 3-step flow: Sign in → optional ID check → issued credential.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import type { StoredCredential } from "@/lib/credentials/storage";
import type {
  CredentialVerifyState,
  IdentityStampStatus,
} from "@/lib/hooks/usePassportVerification";
import { consumerCopy } from "@/lib/consumerCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

type StepId = 1 | 2 | 3;

function resolveCurrentStep(
  walletDone: boolean,
  identityStatus: IdentityStampStatus,
  hasCredential: boolean,
): StepId {
  if (!walletDone) return 1;
  if (hasCredential || identityStatus === "earned") return 3;
  return 2;
}

function stepStatus(
  step: StepId,
  walletDone: boolean,
  identityStatus: IdentityStampStatus,
  hasCredential: boolean,
): "done" | "active" | "pending" | "optional" | "review" {
  if (step === 1) {
    return walletDone ? "done" : "active";
  }
  if (step === 2) {
    if (!walletDone) return "pending";
    if (identityStatus === "pending") return "review";
    if (hasCredential || identityStatus === "earned") return "done";
    return "optional";
  }
  if (!walletDone) return "pending";
  if (hasCredential || identityStatus === "earned") return "done";
  return "pending";
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
}) {
  const hasCredential = Boolean(credential) && identityStatus === "earned";
  const currentStep = resolveCurrentStep(walletDone, identityStatus, hasCredential);
  const [expanded, setExpanded] = useState<StepId>(currentStep);
  const [copied, setCopied] = useState<"jwt" | "wallet" | null>(null);

  useEffect(() => {
    setExpanded(currentStep);
  }, [currentStep]);

  const steps = [
    {
      id: 1 as StepId,
      title: "Sign in with Google",
      subtitle: "zkLogin creates your Abraxas wallet — no seed phrase",
      badge: "Required",
    },
    {
      id: 2 as StepId,
      title: consumerCopy.passport.idCheck,
      subtitle: consumerCopy.passport.precheckProvider,
      badge: "Optional",
    },
    {
      id: 3 as StepId,
      title: "Your credential",
      subtitle: "Portable proof partners can verify — without seeing your documents",
      badge: "Issued after ID check",
    },
  ];

  const progressPct = hasCredential ? 100 : walletDone ? 66 : identityStatus === "pending" ? 50 : walletDone ? 66 : 33;

  async function copyText(text: string, kind: "jwt" | "wallet") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  const verifyWalletUrl = suiAddress
    ? `/api/credentials/verify?wallet=${encodeURIComponent(suiAddress)}`
    : null;

  return (
    <section style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <div style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.4rem",
          }}>
            Guided walkthrough
          </div>
          <h2 style={{
            fontFamily: FONT, fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", fontWeight: 800,
            letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0,
          }}>
            Three steps. Verify once, reuse everywhere.
          </h2>
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
          Step {currentStep} of 3
        </div>
      </div>

      <div style={{
        height: 4, borderRadius: 999, background: "var(--border)",
        marginBottom: "1rem", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${progressPct}%`, borderRadius: 999,
          background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}cc)`,
          transition: "width 0.45s ease",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {steps.map(step => {
          const status = stepStatus(step.id, walletDone, identityStatus, hasCredential);
          const isOpen = expanded === step.id;
          const isDone = status === "done";
          const isReview = status === "review";
          const isLocked = status === "pending";

          const borderColor = isDone ? `${ACCENT}55` : isOpen ? `${ACCENT}66` : "var(--border)";
          const headerBg = isDone ? `${ACCENT}08` : isOpen ? "var(--surface-raised)" : "var(--surface)";

          return (
            <div
              key={step.id}
              style={{
                borderRadius: 14, border: `1px solid ${borderColor}`,
                background: headerBg, overflow: "hidden",
                opacity: isLocked ? 0.72 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => !isLocked && setExpanded(step.id)}
                disabled={isLocked}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "0.85rem",
                  padding: "1rem 1.15rem", border: "none", background: "transparent",
                  cursor: isLocked ? "default" : "pointer", textAlign: "left",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isDone ? ACCENT : isReview ? `${AMBER}22` : isOpen ? `${ACCENT}18` : "var(--surface-raised)",
                  border: `1.5px solid ${isDone ? ACCENT : isReview ? AMBER : isOpen ? `${ACCENT}55` : "var(--border)"}`,
                  fontFamily: MONO, fontSize: "0.72rem", fontWeight: 800,
                  color: isDone ? "#000" : isReview ? AMBER : isOpen ? ACCENT : "var(--text-muted)",
                }}>
                  {isDone ? "✓" : step.id}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.15rem" }}>
                    <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {step.title}
                    </span>
                    <span style={{
                      fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      padding: "0.15rem 0.45rem", borderRadius: 999,
                      color: isDone ? ACCENT : isReview ? AMBER : "var(--text-muted)",
                      border: `1px solid ${isDone ? `${ACCENT}44` : isReview ? `${AMBER}44` : "var(--border)"}`,
                    }}>
                      {isDone ? "Complete" : isReview ? "In review" : status === "optional" ? step.badge : step.badge}
                    </span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {step.subtitle}
                  </div>
                </div>

                {!isLocked && (
                  <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0 }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                )}
              </button>

              {isOpen && (
                <div style={{ padding: "0 1.15rem 1.15rem", borderTop: "1px solid var(--border)" }}>
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
                        <div style={{
                          padding: "1rem", borderRadius: 10,
                          background: `${ACCENT}10`, border: `1px solid ${ACCENT}33`,
                        }}>
                          <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: ACCENT, marginBottom: "0.35rem" }}>
                            ✓ Account ready
                          </div>
                          {email && (
                            <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                              Signed in as <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
                            </div>
                          )}
                          {suiAddress && (
                            <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                              Wallet: {truncateSuiAddress(suiAddress, 10, 8)}
                            </div>
                          )}
                          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0.75rem 0 0" }}>
                            Browse assets and book stays now. Add an ID check in step 2 when a deal needs enhanced trust.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {step.id === 2 && (
                    <div style={{ paddingTop: "1rem" }}>
                      {identityStatus === "pending" || isPolling ? (
                        <div style={{
                          padding: "1rem", borderRadius: 10,
                          background: `${AMBER}10`, border: `1px solid ${AMBER}33`,
                        }}>
                          <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: AMBER, marginBottom: "0.35rem" }}>
                            ID check in review
                          </div>
                          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
                            Your documents are being reviewed. This page checks every few seconds and issues your credential automatically when approved.
                          </p>
                          <button type="button" onClick={onRefresh} disabled={isRefreshing}
                            style={{
                              padding: "0.45rem 0.9rem", borderRadius: 999, border: `1px solid ${AMBER}55`,
                              background: "transparent", color: AMBER, fontFamily: FONT, fontSize: "0.75rem",
                              fontWeight: 600, cursor: "pointer", opacity: isRefreshing ? 0.6 : 1,
                            }}>
                            {isRefreshing ? "Checking…" : "Check status now"}
                          </button>
                        </div>
                      ) : identityStatus === "declined" ? (
                        <div style={{
                          padding: "1rem", borderRadius: 10,
                          background: "#EF444410", border: "1px solid #EF444444",
                          marginBottom: "0.85rem",
                        }}>
                          <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "#EF4444", marginBottom: "0.35rem" }}>
                            Verification not approved
                          </div>
                          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                            Try again or upload your ID for manual review in the stamps section below.
                          </p>
                        </div>
                      ) : (
                        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
                          Most users browse first. Start an ID check only when a booking, investment, or partner requires enhanced trust.
                        </p>
                      )}

                      {!hasCredential && identityStatus !== "pending" && !isPolling && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={onStartIdCheck}
                            disabled={starting || !walletDone}
                            style={{
                              padding: "0.75rem 1.5rem", borderRadius: 8, border: "none",
                              background: walletDone ? ACCENT : "var(--surface-raised)",
                              color: walletDone ? "#000" : "var(--text-muted)",
                              fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700,
                              cursor: walletDone ? "pointer" : "not-allowed",
                              opacity: starting ? 0.6 : 1,
                            }}
                          >
                            {starting ? "Starting…" : `${consumerCopy.passport.precheck} →`}
                          </button>
                          {walletDone && (
                            <Link href="/"
                              style={{
                                padding: "0.75rem 1.25rem", borderRadius: 8,
                                border: "1px solid var(--border)", background: "var(--surface)",
                                color: "var(--text-secondary)", fontFamily: FONT,
                                fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
                              }}>
                              Skip — browse assets →
                            </Link>
                          )}
                        </div>
                      )}

                      {error && (
                        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", marginTop: "0.75rem" }}>
                          {error}
                        </div>
                      )}
                    </div>
                  )}

                  {step.id === 3 && (
                    <div style={{ paddingTop: "1rem" }}>
                      {hasCredential && credential ? (
                        <>
                          <div style={{
                            padding: "1rem", borderRadius: 10,
                            background: `${ACCENT}10`, border: `1px solid ${ACCENT}33`,
                            marginBottom: "0.85rem",
                          }}>
                            <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                              Credential issued
                            </div>
                            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                              {verifyState === "valid" ? "Cryptographically verified — ready to share" : "Identity verified — portable proof ready"}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem" }}>
                              {[
                                { k: "Level", v: credential.level.toUpperCase() },
                                { k: "Expires", v: new Date(credential.expires_at).toLocaleDateString() },
                              ].map(row => (
                                <div key={row.k} style={{ background: "var(--surface)", borderRadius: 8, padding: "0.45rem 0.55rem", border: "1px solid var(--border)" }}>
                                  <div style={{ fontFamily: MONO, fontSize: "0.45rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{row.k}</div>
                                  <div style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.v}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            {verifyWalletUrl && (
                              <Link href={verifyWalletUrl} target="_blank"
                                style={{
                                  padding: "0.55rem 1rem", borderRadius: 999, background: ACCENT, color: "#000",
                                  fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, textDecoration: "none",
                                }}>
                                Open verify link ↗
                              </Link>
                            )}
                            <Link href="/verify"
                              style={{
                                padding: "0.55rem 1rem", borderRadius: 999,
                                border: "1px solid var(--border)", background: "var(--surface)",
                                color: "var(--text-secondary)", fontFamily: FONT,
                                fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
                              }}>
                              Public verifier →
                            </Link>
                            <button type="button" onClick={() => copyText(credential.jwt, "jwt")}
                              style={{
                                padding: "0.55rem 1rem", borderRadius: 999,
                                border: "1px solid var(--border)", background: "var(--surface)",
                                color: "var(--text-secondary)", fontFamily: FONT,
                                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                              }}>
                              {copied === "jwt" ? "✓ Copied JWT" : "Copy credential JWT"}
                            </button>
                            {suiAddress && (
                              <button type="button" onClick={() => copyText(suiAddress, "wallet")}
                                style={{
                                  padding: "0.55rem 1rem", borderRadius: 999,
                                  border: "1px solid var(--border)", background: "var(--surface)",
                                  color: "var(--text-secondary)", fontFamily: FONT,
                                  fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                                }}>
                                {copied === "wallet" ? "✓ Copied wallet" : "Copy wallet address"}
                              </button>
                            )}
                          </div>

                          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                            Partners call <code style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>POST /api/credentials/verify</code> with your JWT — or look up your wallet with the verify link above. Full credential details appear below.
                          </p>
                        </>
                      ) : (
                        <div style={{
                          padding: "1rem", borderRadius: 10,
                          border: "1px dashed var(--border)", background: "var(--surface)",
                        }}>
                          <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                            Unlocked after ID check
                          </div>
                          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
                            {walletDone
                              ? "Complete step 2 to receive a signed W3C credential and verify link. You can browse and book without it."
                              : "Sign in first, then optionally add an ID check to receive portable proof."}
                          </p>
                          {walletDone && identityStatus !== "pending" && (
                            <button type="button" onClick={() => setExpanded(2)}
                              style={{
                                padding: "0.5rem 1rem", borderRadius: 999,
                                border: `1px solid ${ACCENT}55`, background: "transparent",
                                color: ACCENT, fontFamily: FONT, fontSize: "0.75rem",
                                fontWeight: 600, cursor: "pointer",
                              }}>
                              Go to ID check →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
