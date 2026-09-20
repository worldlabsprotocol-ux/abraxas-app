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
import { HolderRecoveryCard } from "@/components/partner/HolderRecoveryCard";
import {
  buildHolderRequestBrief,
  resolveHolderRecovery,
  type HolderRequestBrief,
} from "@/lib/partner/holderExperience";

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
  | "return_failed"
  | "expired"
  | "missing"
  | "cancelled"
  | "invalid_binding"
  | "method_not_qualified"
  | "provider_unavailable"
  | "approved";

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
  environment?: string | null;
  disclosedResult?: string | null;
}

function recoveryForPhase(phase: PartnerVerifyPhase) {
  switch (phase) {
    case "loading":
    case "preparing":
    case "verifying":
    case "signing_in":
    case "returning":
    case "pending_review":
      return "loading" as const;
    case "sign_in":
      return "session_required" as const;
    case "expired":
      return "expired" as const;
    case "missing":
    case "invalid_link":
      return "missing" as const;
    case "cancelled":
      return "cancelled" as const;
    case "denied":
      return "denied" as const;
    case "provider_unavailable":
      return "provider_unavailable" as const;
    case "error":
    case "return_failed":
    case "invalid_binding":
      return "invalid_binding" as const;
    case "method_not_qualified":
      return "method_not_qualified" as const;
    case "approved":
      return "approved" as const;
    default:
      return "loading" as const;
  }
}

function showSignIn(phase: PartnerVerifyPhase): boolean {
  return phase === "sign_in" || phase === "signing_in";
}

function showReturnButton(phase: PartnerVerifyPhase): boolean {
  return phase === "error"
    || phase === "return_failed"
    || phase === "denied"
    || phase === "pending_review"
    || phase === "expired"
    || phase === "missing"
    || phase === "cancelled"
    || phase === "invalid_binding"
    || phase === "invalid_link"
    || phase === "provider_unavailable"
    || phase === "approved";
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
  environment = null,
  disclosedResult = null,
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
  const brief: HolderRequestBrief = buildHolderRequestBrief({
    partnerId,
    partnerName,
    policyId,
    purpose,
    environment,
    disclosedResult,
    userExplanation: policyRequirement,
  });
  const recovery = resolveHolderRecovery(recoveryForPhase(phase), partnerName, partnerHomeUrl);

  if (phase === "invalid_link" && invalidLinkMessage) {
    return (
      <PartnerJourneyLayout
        partnerName={partnerName}
        intro={resolvePartnerContinuationIntro(partnerId, continuationContext)}
        statusMessage=""
        hideStatus
        partnerHomeUrl={partnerHomeUrl}
        partnerReturnLabel={partnerReturnLabel}
        brief={brief}
      >
        <HolderRecoveryCard recovery={recovery} />
      </PartnerJourneyLayout>
    );
  }

  const busy = phase === "signing_in" || phase === "preparing" || phase === "verifying" || phase === "returning";

  const recoveryPhases = phase === "error" || phase === "return_failed" || phase === "expired" || phase === "missing" || phase === "cancelled" || phase === "invalid_binding" || phase === "method_not_qualified" || phase === "provider_unavailable" || phase === "denied" || phase === "approved";

  return (
    <PartnerJourneyLayout
      partnerName={partnerName}
      intro={intro}
      statusMessage={resolvedStatus}
      hideStatus={recoveryPhases}
      partnerHomeUrl={showReturnButton(phase) ? partnerHomeUrl : null}
      partnerReturnLabel={partnerReturnLabel}
      showAccountFooter={!useDobFirstSignInCopy}
      brief={useDobFirstSignInCopy ? null : brief}
    >
      {recoveryPhases ? (
        <HolderRecoveryCard
          recovery={{
            ...(phase === "approved" && brief.environment_label.startsWith("Sandbox")
              ? resolveHolderRecovery("sandbox_approved", partnerName, partnerHomeUrl)
              : recovery),
            next_label: phase === "error" || phase === "return_failed" ? "Try again" : (
              phase === "approved" && brief.environment_label.startsWith("Sandbox")
                ? resolveHolderRecovery("sandbox_approved", partnerName, partnerHomeUrl).next_label
                : recovery.next_label
            ),
          }}
          onPrimary={phase === "error" || phase === "return_failed" || phase === "method_not_qualified" ? onTryAgain : undefined}
        />
      ) : (
        <>
          {showSignIn(phase) && signInConfigured && (
            <>
            <Btn
              onClick={onSignIn}
              disabled={primaryDisabled || busy}
              aria-busy={phase === "signing_in"}
            >
              {phase === "signing_in"
                ? "Signing you in…"
                : (useDobFirstSignInCopy ? GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON : "Continue with Google")}
            </Btn>
            <p style={{ margin: "0.65rem 0 0", fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
              Google sign-in opens an Abraxas account only. It is not eligibility proof. After sign-in you choose how to satisfy this policy. Identity or liveness is not the default first step.
            </p>
            </>
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
          Google sign in confirms your account only. The partner receives a policy result, not your ID photos or date of birth through this screen.
        </aside>
      )}
    </PartnerJourneyLayout>
  );
}
