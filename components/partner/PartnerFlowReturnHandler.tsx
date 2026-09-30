"use client";
// FILE: components/partner/PartnerFlowReturnHandler.tsx
// Issues partner-flow receipt when ready — holder sees receipt before returning to partner.

import { useEffect, useRef } from "react";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Btn } from "@/components/redesign/ui";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";

interface Props {
  handoff: PartnerFlowHandoffController;
}

export function PartnerFlowReturnHandler({ handoff }: Props) {
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
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <StatusBanner tone="pending" title="Signing your decision receipt…" loading>
          Abraxas is issuing the signed eligibility receipt for this request.
        </StatusBanner>
      </div>
    );
  }

  if (handoff.phase === "failed") {
    const isNetworkFailure = handoff.failureCategory === "partner_flow_network_failed";

    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <StatusBanner
          tone="error"
          title={isNetworkFailure ? "Connection problem during handoff." : "Couldn't finish the partner handoff."}
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
          {isNetworkFailure
            ? "Check your network and try again."
            : "Your Abraxas verification step finished, but the receipt handoff didn't complete. Try again, or open the partner app and ask them to restart the flow."}
        </StatusBanner>
      </div>
    );
  }

  return null;
}
