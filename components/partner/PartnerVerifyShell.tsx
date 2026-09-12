"use client";
// FILE: components/partner/PartnerVerifyShell.tsx
// Customer partner verification surface — derives from authoritative journey state.

import { Btn } from "@/components/redesign/ui";
import { PartnerJourneyLayout } from "@/components/partner/PartnerJourneyLayout";
import {
  GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON,
  GOOD_TROUBLE_BROWSE_SIGN_IN_CLARIFICATION,
  GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO,
  GOOD_TROUBLE_BROWSE_SIGN_IN_PRIVACY_COPY,
  GOOD_TROUBLE_BROWSE_SIGN_IN_STATUS,
  GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_COPY,
  GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_HEADING,
} from "@/lib/partner/goodTroubleBrowseFlow";
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
  policyId: string;
  purpose?: string | null;
  isDobFirstBrowse: boolean;
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
  policyId,
  purpose,
  isDobFirstBrowse,
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
  const continuationContext = { policyId, purpose };
  const onSignInScreen = showSignIn(phase);
  const useDobFirstSignInCopy = isDobFirstBrowse && onSignInScreen;
  const intro = useDobFirstSignInCopy
    ? GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO
    : resolvePartnerContinuationIntro(partnerId, continuationContext);
  const resolvedStatus = useDobFirstSignInCopy
    ? GOOD_TROUBLE_BROWSE_SIGN_IN_STATUS
    : (statusMessage || policyRequirement);

  if (phase === "invalid_link" && invalidLinkMessage) {
    return (
      <PartnerJourneyLayout
        partnerName={partnerName}
        intro={resolvePartnerContinuationIntro(partnerId, continuationContext)}
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
      intro={intro}
      statusMessage={resolvedStatus}
      partnerHomeUrl={showReturnButton(phase) ? partnerHomeUrl : null}
      partnerReturnLabel={partnerReturnLabel}
      showAccountFooter={!useDobFirstSignInCopy}
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
              {phase === "signing_in"
                ? "Signing you in…"
                : (useDobFirstSignInCopy ? GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON : "Continue with Google")}
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

      {useDobFirstSignInCopy ? (
        <aside
          aria-label="Passport benefits and privacy"
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
            {GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_HEADING}
          </strong>
          <p style={{ margin: "0 0 0.5rem" }}>{GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_COPY}</p>
          <p style={{ margin: "0 0 0.5rem" }}>{GOOD_TROUBLE_BROWSE_SIGN_IN_PRIVACY_COPY}</p>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted, #9ca3af)" }}>
            {GOOD_TROUBLE_BROWSE_SIGN_IN_CLARIFICATION}
          </p>
        </aside>
      ) : (
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
      )}
    </PartnerJourneyLayout>
  );
}
