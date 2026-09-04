"use client";
// FILE: components/partner/PartnerVerifyShell.tsx
// Customer partner verification surface — derives from authoritative journey state.

import { Btn } from "@/components/redesign/ui";
import { PartnerJourneyLayout } from "@/components/partner/PartnerJourneyLayout";
import { resolvePartnerContinuationIntro } from "@/lib/partner/partnerVerifyDisplay";
import type { PartnerJourneyPrimaryAction } from "@/lib/partner/partnerJourneyStateMachine";

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
  | "invalid_link"
  | "return_failed";

export interface PartnerVerifyShellProps {
  phase: PartnerVerifyPhase;
  partnerId: string;
  partnerName: string;
  policyRequirement: string;
  statusMessage: string;
  signInConfigured: boolean;
  primaryDisabled: boolean;
  onSignIn: () => void;
  onTryAgain: () => void;
  invalidLinkMessage?: string | null;
  partnerReturnLabel: string;
  partnerHomeUrl?: string | null;
  primaryAction?: PartnerJourneyPrimaryAction;
}

function showSignIn(phase: PartnerVerifyPhase): boolean {
  return phase === "sign_in" || phase === "signing_in";
}

function showReturnButton(phase: PartnerVerifyPhase): boolean {
  return phase === "error" || phase === "return_failed" || phase === "denied" || phase === "pending_review";
}

export function PartnerVerifyShell({
  phase,
  partnerId,
  partnerName,
  policyRequirement,
  statusMessage,
  signInConfigured,
  primaryDisabled,
  onSignIn,
  onTryAgain,
  invalidLinkMessage,
  partnerReturnLabel,
  partnerHomeUrl,
}: PartnerVerifyShellProps) {
  if (phase === "invalid_link" && invalidLinkMessage) {
    return (
      <PartnerJourneyLayout
        partnerName={partnerName}
        intro={resolvePartnerContinuationIntro(partnerId)}
        statusMessage={invalidLinkMessage}
        partnerHomeUrl={partnerHomeUrl}
        partnerReturnLabel={partnerReturnLabel}
      >
        <p role="alert" style={{ fontSize: "0.88rem", lineHeight: 1.65 }}>
          Ask the partner site for a fresh verification link.
        </p>
      </PartnerJourneyLayout>
    );
  }

  const busy = phase === "signing_in" || phase === "preparing" || phase === "verifying" || phase === "returning";

  return (
    <PartnerJourneyLayout
      partnerName={partnerName}
      intro={resolvePartnerContinuationIntro(partnerId)}
      statusMessage={statusMessage || policyRequirement}
      partnerHomeUrl={showReturnButton(phase) ? partnerHomeUrl : null}
      partnerReturnLabel={partnerReturnLabel}
    >
      {phase === "error" || phase === "return_failed" ? (
        <div role="alert">
          <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", lineHeight: 1.65 }}>
            {statusMessage || "Verification could not be completed."}
          </p>
          <Btn onClick={onTryAgain} style={{ marginBottom: "0.5rem" }}>
            Try again
          </Btn>
        </div>
      ) : (
        <>
          {showSignIn(phase) && signInConfigured && (
            <Btn
              onClick={onSignIn}
              disabled={primaryDisabled || busy}
              aria-busy={phase === "signing_in"}
            >
              {phase === "signing_in" ? "Signing you in…" : "Continue with Google"}
            </Btn>
          )}

          {showSignIn(phase) && !signInConfigured && (
            <p role="alert" style={{ fontSize: "0.86rem" }}>
              Sign-in is not configured in this environment.
            </p>
          )}

          {!showSignIn(phase) && busy && (
            <p role="status" aria-live="polite" style={{ fontSize: "0.86rem", margin: 0 }}>
              {statusMessage}
            </p>
          )}

          {phase === "pending_review" && (
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.86rem", lineHeight: 1.6 }}>
              Your verification is under review. You may close this window and check back later.
            </p>
          )}

          {phase === "denied" && (
            <p role="alert" style={{ margin: "0.75rem 0 0", fontSize: "0.86rem", lineHeight: 1.6 }}>
              This requirement could not be met. Contact the partner if you believe this is an error.
            </p>
          )}
        </>
      )}

      <aside
        aria-label="Privacy notice"
        style={{
          marginTop: "1.25rem",
          padding: "0.85rem 1rem",
          borderRadius: 12,
          border: "1px solid rgba(45,212,191,0.18)",
          background: "rgba(45,212,191,0.06)",
          fontSize: "0.78rem",
          lineHeight: 1.6,
          color: "var(--text-secondary, #d1d5db)",
        }}
      >
        <strong style={{ display: "block", marginBottom: "0.35rem", color: "#2DD4BF" }}>
          Signing in is not age verification
        </strong>
        Google sign-in confirms your account only. The partner receives a policy result — not your ID photos or date of birth through this screen.
      </aside>
    </PartnerJourneyLayout>
  );
}
