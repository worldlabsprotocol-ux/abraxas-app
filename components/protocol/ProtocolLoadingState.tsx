"use client";
// FILE: components/protocol/ProtocolLoadingState.tsx
// Contextual loading — only labels that match real operations.

import { ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

export type ProtocolLoadingKind =
  | "evaluating_policy"
  | "checking_freshness"
  | "signing_decision"
  | "verifying_receipt"
  | "preparing_request"
  | "loading";

const LABELS: Record<ProtocolLoadingKind, string> = {
  evaluating_policy: "Evaluating policy",
  checking_freshness: "Checking evidence freshness",
  signing_decision: "Signing decision",
  verifying_receipt: "Verifying receipt",
  preparing_request: "Preparing private request",
  loading: "Loading",
};

export function ProtocolLoadingState({
  kind = "loading",
  detail,
}: {
  kind?: ProtocolLoadingKind;
  detail?: string;
}) {
  return (
    <div className="abx-protocol-loading" role="status" aria-live="polite">
      <span className="abx-protocol-loading__pulse" aria-hidden />
      <div>
        <p className="abx-protocol-loading__label" style={{ fontFamily: ABX_FONT_SANS }}>
          {LABELS[kind]}
        </p>
        {detail ? (
          <p className="abx-protocol-loading__detail" style={{ fontFamily: ABX_FONT_MONO }}>
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
