"use client";
// FILE: components/partner/PartnerFlowReturnHandler.tsx
// After Passport approval, complete partner flow and redirect back to relying party.

import { useEffect } from "react";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Btn } from "@/components/redesign/ui";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";

interface Props {
  handoff: PartnerFlowHandoffController;
}

export function PartnerFlowReturnHandler({ handoff }: Props) {
  useEffect(() => {
    if (handoff.ready && handoff.phase === "idle" && !handoff.inFlight) {
      void handoff.complete();
    }
  }, [handoff.ready, handoff.phase, handoff.inFlight, handoff.complete]);

  if (!handoff.isPartnerFlowContext) return null;

  if (!handoff.ready) {
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <StatusBanner tone="pending" title="Return pending">
          Finish the steps above. Abraxas will complete the partner handoff automatically when your Passport is ready.
        </StatusBanner>
      </div>
    );
  }

  if (handoff.phase === "idle") return null;

  if (handoff.phase === "completing") {
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <StatusBanner tone="pending" title="Returning you to the partner app…" loading>
          Finishing the handoff. Keep this tab open.
        </StatusBanner>
      </div>
    );
  }

  const isNetworkFailure = handoff.failureCategory === "partner_flow_network_failed";

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <StatusBanner
        tone="error"
        title={isNetworkFailure ? "Connection problem during handoff." : "Couldn't return you to the partner app."}
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
          : "Your Abraxas verification step finished, but the handoff didn't complete. Try again, or open the partner app and ask them to restart the flow."}
      </StatusBanner>
    </div>
  );
}
