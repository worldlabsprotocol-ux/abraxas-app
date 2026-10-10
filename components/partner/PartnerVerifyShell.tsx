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
  isGoodTroubleHostedDirectHandoff,
} from "@/lib/partner/goodTroubleBrowseFlow";
import { isGoodTroubleAgeEligibilityPurchaseBrief } from "@/lib/partner/goodTroubleHolderBrief";
import { resolvePartnerContinuationIntro } from "@/lib/partner/partnerVerifyDisplay";
import type { PartnerJourneyPrimaryAction } from "@/lib/partner/partnerJourneyStateMachine";
import {
  buildHolderRequestBrief,
  buildHolderVerificationPresentation,
  mapVerifyPhaseToChecking,
  resolveHolderRecovery,
  HOLDER_RETURN_FAILURE_TECHNICAL,
  type HolderRequestBrief,
} from "@/lib/partner/holderExperience";
import {
  HOSTED_HOLDER_OPTIONAL_SIGN_IN_LABEL,
  HOSTED_HOLDER_PRIMARY_ACTION,
} from "@/lib/auth/hostedHolderEligibility";
import { WalletFirstSignIn } from "@/components/auth/WalletFirstSignIn";
import {
  HolderSuccessState,
  VerificationFailure,
  VerificationProgress,
} from "@/components/partner/holder";
import { PrivacyComparisonPanel, type PrivacyComparisonPartner } from "@/components/experience/PrivacyComparisonPanel";
import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";

export type PartnerVerifyPhase =
  | "loading"
  | "bootstrapping"
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
  hostedBootstrapEligible?: boolean;
  onOptionalSignIn?: () => void;
  /** Phantom-first sign-in for Solana-native partner flows (#508). */
  walletPrimarySignIn?: boolean;
  onWalletSignInSuccess?: () => void;
  flowSupportRef?: string | null;
  flowNextStepHint?: string | null;
}

function recoveryForPhase(phase: PartnerVerifyPhase) {
  switch (phase) {
    case "loading":
    case "bootstrapping":
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
  hostedBootstrapEligible = false,
  onOptionalSignIn,
  walletPrimarySignIn = false,
  onWalletSignInSuccess,
  flowSupportRef = null,
  flowNextStepHint = null,
}: PartnerVerifyShellProps) {
  const continuationContext = { policyId, purpose };
  const onSignInScreen = showSignIn(phase);
  const directHandoff = isGoodTroubleHostedDirectHandoff({
    hostedBootstrapEligible,
    partnerId,
    policyId,
    purpose,
  });
  const goodTroublePurchaseL0 = isGoodTroubleAgeEligibilityPurchaseBrief({
    partnerId,
    policyId,
    purpose,
  });
  const useDobFirstSignInCopy = isDobFirstBrowse && onSignInScreen;
  const intro = directHandoff && !onSignInScreen
    ? ""
    : useDobFirstSignInCopy
      ? GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO
      : resolvePartnerContinuationIntro(partnerId, continuationContext);
  const resolvedStatus = directHandoff && !onSignInScreen
    ? (statusMessage || "")
    : useDobFirstSignInCopy
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
  const presentation = buildHolderVerificationPresentation({
    partnerName,
    policyId,
    brief,
    purpose,
  });
  const recovery = resolveHolderRecovery(recoveryForPhase(phase), partnerName, partnerHomeUrl);
  const checkingPhase = mapVerifyPhaseToChecking(phase);

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
        policyId={policyId}
        purpose={purpose}
      >
        <VerificationFailure recovery={recovery} />
      </PartnerJourneyLayout>
    );
  }

  const busy = phase === "bootstrapping" || phase === "signing_in" || phase === "preparing" || phase === "verifying" || phase === "returning";
  const verificationFirst = hostedBootstrapEligible && (phase === "bootstrapping" || phase === "preparing" || phase === "verifying");

  const recoveryPhases = phase === "error" || phase === "return_failed" || phase === "expired" || phase === "missing" || phase === "cancelled" || phase === "invalid_binding" || phase === "method_not_qualified" || phase === "provider_unavailable" || phase === "denied" || phase === "approved";
  const hideOrientationChrome = directHandoff && !recoveryPhases && !onSignInScreen;
  const hidePurchaseBrief = goodTroublePurchaseL0 && (recoveryPhases || hideOrientationChrome || onSignInScreen);
  const showBrief = !useDobFirstSignInCopy && !hideOrientationChrome && !hidePurchaseBrief;

  const privacyPartner: PrivacyComparisonPartner | null =
    policyId === CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID || policyId.includes("cielo-verified-guest")
      ? "cielo"
      : policyId === GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID || policyId.includes("good-trouble-age")
        ? "good_trouble"
        : null;

  const sandboxApproved = phase === "approved" && presentation.isSandbox;
  const approvedRecovery = sandboxApproved
    ? resolveHolderRecovery("sandbox_approved", partnerName, partnerHomeUrl)
    : recovery;

  return (
    <PartnerJourneyLayout
      partnerName={partnerName}
      intro={intro}
      statusMessage={resolvedStatus}
      hideStatus={recoveryPhases || hideOrientationChrome || Boolean(showBrief)}
      hideIntro={Boolean(showBrief)}
      hideHeader={hideOrientationChrome}
      partnerHomeUrl={showReturnButton(phase) ? partnerHomeUrl : null}
      partnerReturnLabel={partnerReturnLabel}
      showAccountFooter={!useDobFirstSignInCopy && !hideOrientationChrome && !showBrief}
      brief={showBrief ? brief : null}
      policyId={policyId}
      purpose={purpose}
    >
      {showBrief && privacyPartner ? (
        <div style={{ marginBottom: "1rem" }} aria-label="Privacy comparison">
          <PrivacyComparisonPanel partner={privacyPartner} compact />
        </div>
      ) : null}
      {phase === "approved" ? (
        <HolderSuccessState
          presentation={presentation}
          isSandbox={presentation.isSandbox}
          returnLabel={approvedRecovery.next_label}
        />
      ) : recoveryPhases ? (
        <VerificationFailure
          recovery={{
            ...recovery,
            next_label: phase === "error" || phase === "return_failed" || phase === "denied"
              ? "Try again"
              : recovery.next_label,
          }}
          onPrimary={
            phase === "error" || phase === "return_failed" || phase === "method_not_qualified" || phase === "denied"
              ? onTryAgain
              : undefined
          }
          technicalDetail={
            phase === "invalid_binding" || phase === "error" || phase === "return_failed"
              ? HOLDER_RETURN_FAILURE_TECHNICAL
              : null
          }
          supportRef={flowSupportRef}
          nextStepHint={flowNextStepHint}
        />
      ) : (
        <>
          {verificationFirst && (
            <p role="status" aria-live="polite" style={{ fontSize: "0.86rem", margin: 0, lineHeight: 1.6 }}>
              {statusMessage || HOSTED_HOLDER_PRIMARY_ACTION}
            </p>
          )}

          {showSignIn(phase) && signInConfigured && !hostedBootstrapEligible && walletPrimarySignIn && (
            <>
              <WalletFirstSignIn
                onSuccess={() => onWalletSignInSuccess?.()}
              />
              <p style={{ margin: "0.65rem 0 0", fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
                Wallet sign-in proves control of your Phantom wallet — not government ID or age. You will review the exact disclosure before sharing anything.
              </p>
            </>
          )}

          {showSignIn(phase) && signInConfigured && !hostedBootstrapEligible && !walletPrimarySignIn && (
            <>
            <Btn
              onClick={onSignIn}
              disabled={primaryDisabled || busy}
              aria-busy={phase === "signing_in"}
            >
              {phase === "signing_in"
                ? "Signing you in…"
                : (useDobFirstSignInCopy ? GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON : "Continue")}
            </Btn>
            <p style={{ margin: "0.65rem 0 0", fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
              Google sign-in opens an Abraxas account only. It is not eligibility proof. After sign-in you choose how to satisfy this request.
            </p>
            </>
          )}

          {showSignIn(phase) && signInConfigured && hostedBootstrapEligible && onOptionalSignIn && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <button
                type="button"
                onClick={onOptionalSignIn}
                disabled={primaryDisabled || busy}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--accent)",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {HOSTED_HOLDER_OPTIONAL_SIGN_IN_LABEL}
              </button>
            </p>
          )}

          {showSignIn(phase) && !signInConfigured && (
            <p role="alert" style={{ fontSize: "0.86rem" }}>
              Sign-in is not configured in this environment.
            </p>
          )}

          {!showSignIn(phase) && busy && (
            <>
              <VerificationProgress phase={checkingPhase === "idle" ? "checking_request" : checkingPhase} />
              {statusMessage && checkingPhase === "idle" ? (
                <p role="status" aria-live="polite" style={{ fontSize: "0.86rem", margin: "0.5rem 0 0" }}>
                  {statusMessage}
                </p>
              ) : null}
            </>
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
      ) : verificationFirst && !hideOrientationChrome ? (
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
            What Good Trouble receives
          </strong>
          Only 21+ eligibility — not your date of birth, identity document, or document number.
        </aside>
      ) : null}
    </PartnerJourneyLayout>
  );
}
