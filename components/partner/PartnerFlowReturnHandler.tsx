"use client";
// FILE: components/partner/PartnerFlowReturnHandler.tsx
// Issues partner-flow receipt when ready — holder sees receipt before returning to partner.

import { useEffect, useRef } from "react";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Btn } from "@/components/redesign/ui";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";

interface Props {
  handoff: PartnerFlowHandoffController;
  /** When true, auto-complete still runs but completing/failed banners are omitted (inline card owns UX). */
  suppressSurface?: boolean;
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
    default:
      return {
        title: "Couldn't finish the partner handoff.",
        body: "Your Abraxas verification step finished, but the receipt handoff didn't complete. Try again, or open the partner app and ask them to restart the flow.",
      };
  }
}

export function PartnerFlowReturnHandler({ handoff, suppressSurface = false }: Props) {
  const autoCompleteStarted = useRef(false);

  useEffect(() => {
    if (
      handoff.ready &&
      handoff.phase === "idle" &&
      !handoff.inFlight &&
      !autoCompleteStarted.current
    ) {
      autoCompleteStarted.current = true;
      void handoff.complete();
    }
  }, [handoff.ready, handoff.phase, handoff.inFlight, handoff.complete]);

  if (!handoff.isPartnerFlowContext) return null;

  if (handoff.phase === "completed") return null;

  if (handoff.phase === "completing") {
    if (suppressSurface) return null;
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <StatusBanner tone="pending" title="Signing your decision receipt…" loading>
          Abraxas is issuing the signed eligibility receipt for this request.
        </StatusBanner>
      </div>
    );
  }

  if (handoff.phase === "failed" && handoff.failureCategory) {
    if (suppressSurface) return null;
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
