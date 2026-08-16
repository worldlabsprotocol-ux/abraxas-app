"use client";
// FILE: components/partner/PartnerFlowReturnHandler.tsx
// After Passport approval, complete partner flow and redirect back to relying party.

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Btn } from "@/components/redesign/ui";

type HandoffPhase = "idle" | "completing" | "failed";
type HandoffFailureCategory = "partner_flow_completion_failed" | "partner_flow_network_failed";

interface Props {
  suiAddress: string | null;
  identityStatus: string;
  hasCredential: boolean;
  returnPath: string | null;
  partnerId: string | null;
  policyId: string | null;
  verificationRequestId: string | null;
}

export function PartnerFlowReturnHandler({
  suiAddress,
  identityStatus,
  hasCredential,
  returnPath,
  partnerId,
  policyId,
  verificationRequestId,
}: Props) {
  const [phase, setPhase] = useState<HandoffPhase>("idle");
  const [failureCategory, setFailureCategory] = useState<HandoffFailureCategory | null>(null);
  const inFlightRef = useRef(false);

  const readyToHandoff = Boolean(
    suiAddress && returnPath && partnerId && policyId
    && identityStatus === "earned" && hasCredential,
  );

  const runHandoff = useCallback(async () => {
    if (!readyToHandoff || !returnPath || !partnerId || !policyId || !suiAddress) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setPhase("completing");
    setFailureCategory(null);

    const returnUrl = decodeURIComponent(returnPath);

    try {
      const res = await fetch("/api/v1/partner-flow/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          partner_id: partnerId,
          policy_id: policyId,
          return_url: returnUrl,
          verification_request_id: verificationRequestId ?? undefined,
        }),
      });
      const data = await res.json() as { redirect_url?: string };
      if (res.ok && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      setFailureCategory("partner_flow_completion_failed");
      setPhase("failed");
    } catch {
      setFailureCategory("partner_flow_network_failed");
      setPhase("failed");
    } finally {
      inFlightRef.current = false;
    }
  }, [
    readyToHandoff,
    returnPath,
    partnerId,
    policyId,
    suiAddress,
    verificationRequestId,
  ]);

  useEffect(() => {
    if (!readyToHandoff) {
      setPhase("idle");
      setFailureCategory(null);
      return;
    }
    if (phase === "idle") {
      void runHandoff();
    }
  }, [readyToHandoff, phase, runHandoff]);

  if (!readyToHandoff || phase === "idle") return null;

  if (phase === "completing") {
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <StatusBanner tone="pending" title="Returning you to the partner app…" loading>
          Finishing the handoff. Keep this tab open.
        </StatusBanner>
      </div>
    );
  }

  const isNetworkFailure = failureCategory === "partner_flow_network_failed";

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <StatusBanner
        tone="error"
        title={isNetworkFailure ? "Connection problem during handoff." : "Couldn't return you to the partner app."}
        action={(
          <Btn size="sm" onClick={() => void runHandoff()}>
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
