"use client";
// FILE: components/protocol/LiveDecisionReceiptCard.tsx
// Fetches a public receipt and renders DecisionReceiptCard from live protocol state.

import { useEffect, useState } from "react";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  buildDecisionReceiptDisplayModel,
  partnerSafeDenialMessage,
} from "@/lib/protocol/decisionReceiptDisplay";
import { DecisionReceiptCard } from "@/components/protocol/DecisionReceiptCard";
import { ProtocolLoadingState } from "@/components/protocol/ProtocolLoadingState";

export type LiveDecisionReceiptCardProps = {
  receiptId: string;
  partnerName?: string;
  actionPermitted?: boolean;
  motionPhase?: "idle" | "verifying" | "resolved";
  compact?: boolean;
  className?: string;
  onLoaded?: (receipt: PartnerFlowPublicReceipt | DecisionReceiptPublicView) => void;
};

export function LiveDecisionReceiptCard({
  receiptId,
  partnerName,
  actionPermitted,
  motionPhase = "resolved",
  compact = false,
  className,
  onLoaded,
}: LiveDecisionReceiptCardProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [model, setModel] = useState<ReturnType<typeof buildDecisionReceiptDisplayModel> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setErrorMessage(null);
    setModel(null);

    void (async () => {
      try {
        const res = await fetch(`/api/receipts/${encodeURIComponent(receiptId)}/public`);
        const data = await res.json() as (PartnerFlowPublicReceipt & DecisionReceiptPublicView & { error?: string });
        if (!res.ok) {
          throw new Error(partnerSafeDenialMessage("verification_incomplete") ?? "Unable to verify receipt");
        }
        if (cancelled) return;
        const displayModel = buildDecisionReceiptDisplayModel(data, {
          partnerName,
          actionPermitted,
        });
        setModel(displayModel);
        setPhase("ready");
        onLoaded?.(data);
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to verify receipt");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [receiptId, partnerName, actionPermitted, onLoaded]);

  if (phase === "loading") {
    return (
      <ProtocolLoadingState
        kind="verifying_receipt"
        detail={motionPhase === "verifying" ? "Verifying receipt…" : undefined}
      />
    );
  }

  if (phase === "error" || !model) {
    return (
      <div
        className={`abx-decision-receipt abx-decision-receipt--unknown ${className ?? ""}`.trim()}
        role="status"
        aria-live="polite"
      >
        <p className="abx-decision-receipt__result" style={{ margin: 0, fontSize: "0.9rem" }}>
          {errorMessage ?? "Unable to verify receipt"}
        </p>
      </div>
    );
  }

  return (
    <DecisionReceiptCard
      model={model}
      compact={compact}
      motionPhase={motionPhase}
      className={className}
    />
  );
}
