"use client";
// FILE: components/partner/PartnerVerifyShell.tsx
// Institutional partner verification surface — Abraxas trust UI.

import Link from "next/link";
import { useId, useState, type CSSProperties } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,monospace";
const VIOLET = "#a78bfa";
const GOLD = "#E8C547";
const TEAL = "#2DD4BF";
const SURFACE = "rgba(12, 14, 24, 0.92)";
const BORDER = "rgba(167, 139, 250, 0.22)";

export type PartnerVerifyPhase =
  | "loading"
  | "sign_in"
  | "signing_in"
  | "preparing"
  | "verifying"
  | "returning"
  | "pending_review"
  | "denied"
  | "error"
  | "invalid_link";

export interface PartnerVerifyShellProps {
  phase: PartnerVerifyPhase;
  partnerName: string;
  policyRequirement: string;
  policyId: string;
  statusMessage: string;
  correlationId: string | null;
  signInConfigured: boolean;
  primaryDisabled: boolean;
  onSignIn: () => void;
  onTryAgain: () => void;
  invalidLinkMessage?: string | null;
  partnerReturnLabel: string;
  partnerHomeUrl?: string | null;
}

const STEPS = [
  { id: 1, label: "Sign in" },
  { id: 2, label: "Verify policy" },
  { id: 3, label: "Return securely" },
] as const;

function activeStepForPhase(phase: PartnerVerifyPhase): number {
  if (phase === "sign_in" || phase === "signing_in" || phase === "loading") return 1;
  if (phase === "preparing" || phase === "verifying" || phase === "pending_review" || phase === "denied") return 2;
  return 3;
}

function primaryLabel(phase: PartnerVerifyPhase): string {
  switch (phase) {
    case "signing_in": return "Signing you in…";
    case "preparing": return "Preparing secure verification…";
    case "verifying": return "Verifying policy…";
    case "returning": return "Returning to partner…";
    default: return "Continue with Google";
  }
}

export function PartnerVerifyShell({
  phase,
  partnerName,
  policyRequirement,
  policyId,
  statusMessage,
  correlationId,
  signInConfigured,
  primaryDisabled,
  onSignIn,
  onTryAgain,
  invalidLinkMessage,
  partnerReturnLabel,
  partnerHomeUrl,
}: PartnerVerifyShellProps) {
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const activeStep = activeStepForPhase(phase);
  const showPrimary = phase === "sign_in" || phase === "signing_in";
  const showProgress = phase !== "invalid_link" && phase !== "error";
  const busy = phase === "signing_in" || phase === "preparing" || phase === "verifying" || phase === "returning";

  return (
    <div
      className="partner-verify-shell"
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 2.5rem)",
        fontFamily: FONT,
        color: "var(--text-primary, #f4f4f5)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(167,139,250,0.12), transparent 55%),"
            + "radial-gradient(ellipse 60% 40% at 100% 100%, rgba(232,197,71,0.08), transparent 50%),"
            + "linear-gradient(180deg, #04050a 0%, #080a12 45%, #060810 100%)",
        }}
      />

      <main
        style={{
          position: "relative",
          width: "min(100%, 560px)",
          borderRadius: 20,
          border: `1px solid ${BORDER}`,
          background: SURFACE,
          boxShadow: "0 24px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "1.35rem 1.5rem 1rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, rgba(167,139,250,0.08) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.35rem" }}>
            <div
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(167,139,250,0.35), rgba(232,197,71,0.25))",
                border: `1px solid ${BORDER}`,
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: "0.82rem",
                color: GOLD,
              }}
            >
              A
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", letterSpacing: "0.14em", color: VIOLET, fontWeight: 700 }}>
                ABRAXAS
              </p>
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Secure policy verification</p>
            </div>
          </div>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "var(--text-muted, #b8c0cc)" }}>
            Encrypted session · Policy result only
          </p>
        </header>

        <div style={{ padding: "1.35rem 1.5rem 1.5rem" }}>
          {phase === "invalid_link" && invalidLinkMessage ? (
            <div role="alert">
              <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 800 }}>This link isn&apos;t valid</h1>
              <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", lineHeight: 1.65, color: "var(--text-secondary, #d1d5db)" }}>
                {invalidLinkMessage}
              </p>
              <Link href="/docs/partner-flow" style={{ color: TEAL, fontWeight: 600, fontSize: "0.84rem", textDecoration: "none" }}>
                Partner Flow documentation
              </Link>
            </div>
          ) : (
            <>
              <section aria-labelledby="partner-verify-heading" style={{ marginBottom: "1.25rem" }}>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.78rem", color: VIOLET, fontWeight: 600, letterSpacing: "0.06em" }}>
                  VERIFICATION REQUEST
                </p>
                <h1 id="partner-verify-heading" style={{ margin: "0 0 0.45rem", fontSize: "clamp(1.2rem, 3vw, 1.45rem)", fontWeight: 800, lineHeight: 1.25 }}>
                  Continue to {partnerName}
                </h1>
                <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary, #d1d5db)" }}>
                  {policyRequirement}
                </p>
                <p style={{ margin: "0.65rem 0 0", fontSize: "0.82rem", color: "var(--text-muted, #b8c0cc)" }}>
                  Partner: <strong style={{ color: "var(--text-primary, #f4f4f5)" }}>{partnerName}</strong>
                </p>
                <button
                  type="button"
                  aria-expanded={detailsOpen}
                  aria-controls={detailsId}
                  onClick={() => setDetailsOpen((open) => !open)}
                  style={{
                    marginTop: "0.55rem",
                    padding: 0,
                    border: "none",
                    background: "none",
                    color: VIOLET,
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {detailsOpen ? "Hide" : "Show"} technical details
                </button>
                {detailsOpen && (
                  <div
                    id={detailsId}
                    style={{
                      marginTop: "0.55rem",
                      padding: "0.65rem 0.75rem",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(0,0,0,0.25)",
                      fontFamily: MONO,
                      fontSize: "0.72rem",
                      color: "var(--text-muted, #b8c0cc)",
                      wordBreak: "break-all",
                    }}
                  >
                    Policy ID: {policyId}
                  </div>
                )}
              </section>

              {showProgress && (
                <ol
                  aria-label="Verification progress"
                  style={{
                    listStyle: "none",
                    margin: "0 0 1.25rem",
                    padding: 0,
                    display: "grid",
                    gap: "0.55rem",
                  }}
                >
                  {STEPS.map((step) => {
                    const isActive = step.id === activeStep;
                    const isComplete = step.id < activeStep;
                    return (
                      <li
                        key={step.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          fontSize: "0.82rem",
                          color: isActive ? "var(--text-primary, #f4f4f5)" : "var(--text-muted, #9ca3af)",
                          fontWeight: isActive ? 700 : 500,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            border: `1px solid ${isActive || isComplete ? TEAL : "rgba(255,255,255,0.15)"}`,
                            background: isComplete ? "rgba(45,212,191,0.15)" : isActive ? "rgba(167,139,250,0.12)" : "transparent",
                            color: isComplete ? TEAL : isActive ? VIOLET : "var(--text-muted, #9ca3af)",
                          }}
                        >
                          {isComplete ? "✓" : step.id}
                        </span>
                        {step.label}
                      </li>
                    );
                  })}
                </ol>
              )}

              {phase === "error" ? (
                <div role="alert" style={{ marginBottom: "1rem" }}>
                  <h2 style={{ margin: "0 0 0.45rem", fontSize: "1rem", fontWeight: 800 }}>
                    We couldn&apos;t finish signing you in
                  </h2>
                  <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", lineHeight: 1.65, color: "var(--text-secondary, #d1d5db)" }}>
                    Your secure session could not be confirmed in this browser. Try again, or return to the partner site and restart verification.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={onTryAgain}
                      style={primaryButtonStyle(false)}
                    >
                      Try again
                    </button>
                    {partnerHomeUrl ? (
                      <a href={partnerHomeUrl} style={secondaryButtonStyle}>
                        {partnerReturnLabel}
                      </a>
                    ) : null}
                  </div>
                  {correlationId && (
                    <details style={{ fontSize: "0.74rem", color: "var(--text-muted, #b8c0cc)" }}>
                      <summary style={{ cursor: "pointer" }}>Reference code</summary>
                      <p style={{ fontFamily: MONO, margin: "0.45rem 0 0" }}>{correlationId}</p>
                    </details>
                  )}
                </div>
              ) : (
                <>
                  {showPrimary && signInConfigured && (
                    <button
                      type="button"
                      onClick={onSignIn}
                      disabled={primaryDisabled || busy}
                      aria-busy={phase === "signing_in"}
                      style={primaryButtonStyle(primaryDisabled || busy)}
                    >
                      <span aria-hidden="true" style={{ fontWeight: 800 }}>G</span>
                      {primaryLabel(phase)}
                    </button>
                  )}

                  {showPrimary && !signInConfigured && (
                    <Link href="/passport" style={primaryButtonStyle(false)}>
                      Continue to Passport
                    </Link>
                  )}

                  {!showPrimary && statusMessage && (
                    <p
                      role="status"
                      aria-live="polite"
                      style={{
                        margin: "0.5rem 0 0",
                        fontSize: "0.86rem",
                        color: "var(--text-muted, #b8c0cc)",
                        lineHeight: 1.55,
                      }}
                    >
                      {statusMessage}
                    </p>
                  )}

                  {phase === "pending_review" && (
                    <p style={{ margin: "0.75rem 0 0", fontSize: "0.86rem", color: "var(--text-secondary, #d1d5db)" }}>
                      Your verification is under review. You may close this window and check back after approval.
                    </p>
                  )}

                  {phase === "denied" && (
                    <p role="alert" style={{ margin: "0.75rem 0 0", fontSize: "0.86rem", color: "var(--text-secondary, #d1d5db)" }}>
                      This policy requirement was not met for your account. Contact the partner if you believe this is an error.
                    </p>
                  )}
                </>
              )}

              <aside
                aria-label="Privacy and trust"
                style={{
                  marginTop: "1.35rem",
                  padding: "0.9rem 1rem",
                  borderRadius: 12,
                  border: "1px solid rgba(45,212,191,0.18)",
                  background: "rgba(45,212,191,0.06)",
                }}
              >
                <p style={{ margin: "0 0 0.45rem", fontSize: "0.78rem", fontWeight: 700, color: TEAL }}>
                  Privacy &amp; data minimization
                </p>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.78rem", lineHeight: 1.6, color: "var(--text-secondary, #d1d5db)" }}>
                  <li>{partnerName} does not receive ID photos or date of birth through this screen.</li>
                  <li>Abraxas returns only the policy result or receipt required for this request.</li>
                </ul>
              </aside>
            </>
          )}
        </div>

        <footer
          style={{
            padding: "0.9rem 1.5rem 1.15rem",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem 1rem",
            fontSize: "0.74rem",
          }}
        >
          <Link href="/privacy" style={footerLinkStyle}>Privacy</Link>
          <Link href="/trust-framework" style={footerLinkStyle}>Security</Link>
          <Link href="/docs/partner-flow" style={footerLinkStyle}>Partner Flow docs</Link>
          <Link href="/verification" style={footerLinkStyle}>Verification status</Link>
        </footer>
      </main>

      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .partner-verify-shell * {
            animation: none !important;
            transition: none !important;
          }
        }
        .partner-verify-shell button:focus-visible,
        .partner-verify-shell a:focus-visible,
        .partner-verify-shell summary:focus-visible {
          outline: 2px solid ${TEAL};
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

const footerLinkStyle: CSSProperties = {
  color: "var(--text-muted, #b8c0cc)",
  textDecoration: "none",
  fontWeight: 600,
};

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.45rem",
    width: "100%",
    padding: "0.72rem 1rem",
    borderRadius: 12,
    border: "none",
    background: disabled ? "rgba(45,212,191,0.35)" : `linear-gradient(135deg, ${TEAL} 0%, #14b8a6 100%)`,
    color: "#04130f",
    fontFamily: FONT,
    fontSize: "0.9rem",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    textAlign: "center",
  };
}

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.72rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "var(--text-primary, #f4f4f5)",
  fontFamily: FONT,
  fontSize: "0.86rem",
  fontWeight: 700,
  textDecoration: "none",
};
