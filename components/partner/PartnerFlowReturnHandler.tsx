"use client";
// FILE: components/partner/PartnerFlowReturnHandler.tsx
// Issues partner-flow receipt when ready — holder sees receipt before returning to partner.

import { useEffect, useRef } from "react";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Btn } from "@/components/redesign/ui";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";

interface Props {
  handoff: PartnerFlowHandoffController;
  /** When false, completion runs only from explicit holder actions (e.g. wallet-control consent). */
  autoCompleteWhenReady?: boolean;
}

function failureCopy(category: NonNullable<PartnerFlowHandoffController["failureCategory"]>): {
  title: string;
  body: string;
} {
  switch (category) {
    case "partner_flow_network_failed":
      return {
        title: "Connection problem during handoff.",
        body: "Check your network and try again.",
      };
    case "partner_flow_server_unavailable":
      return {
        title: "Verification is temporarily unavailable.",
        body: "Abraxas could not finish this step right now. Try again in a moment.",
      };
    case "partner_flow_handoff_invalid":
      return {
        title: "This handoff link is no longer valid.",
        body: "Return to the partner app and start the verification request again.",
      };
    case "partner_flow_return_url_rejected":
      return {
        title: "We couldn't return you to the requesting service.",
        body: "This verification link does not match an authorized callback for the request. Start again from the partner or Launchpad link that created this session — do not change callback URLs manually.",
      };
    case "partner_flow_credential_not_ready":
      return {
        title: "Verification isn't ready to finish yet.",
        body: "Wallet control must be confirmed before Abraxas can issue the signed receipt. Reconnect your wallet and complete Verify wallet, then approve sharing again.",
      };
    case "partner_flow_consent_required":
      return {
        title: "Sharing approval is required.",
        body: "Approve sharing below before Abraxas can issue the signed receipt for this request.",
      };
    default:
      return {
        title: "Couldn't finish the partner handoff.",
        body: "Wallet proof and sharing approval may be recorded, but Abraxas did not issue the signed receipt for this request. Try again once, then start a fresh verification link from the partner if it still fails.",
      };
  }
}

export function PartnerFlowReturnHandler({
  handoff,
  autoCompleteWhenReady = true,
}: Props) {
  const autoCompleteStarted = useRef(false);

  useEffect(() => {
    if (!autoCompleteWhenReady) return;
    if (
      handoff.ready &&
      handoff.phase === "idle" &&
      !handoff.inFlight &&
      !autoCompleteStarted.current
    ) {
      autoCompleteStarted.current = true;
      void handoff.complete();
    }
  }, [autoCompleteWhenReady, handoff.ready, handoff.phase, handoff.inFlight, handoff.complete]);

  if (!handoff.isPartnerFlowContext) return null;

  if (handoff.phase === "completed") return null;

  if (handoff.phase === "completing") {
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <StatusBanner tone="pending" title="Signing your decision receipt…" loading>
          Abraxas is issuing the signed eligibility receipt for this request.
        </StatusBanner>
      </div>
    );
  }

  if (handoff.phase === "failed" && handoff.failureCategory) {
    const copy = failureCopy(handoff.failureCategory);

    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <StatusBanner
          tone="error"
          title={copy.title}
          action={(
            <Btn
              size="sm"
              disabled={handoff.inFlight}
              onClick={() => void handoff.complete()}
            >
              Try again
            </Btn>
          )}
        >
          {copy.body}
        </StatusBanner>
      </div>
    );
  }

  return null;
}
