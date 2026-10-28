"use client";
// FILE: components/developers/AbraxasJourneyEmblemStatus.tsx

import { AbraxasLogo } from "@/components/brand/AbraxasLogo";
import { PUBLIC_FONT_SANS } from "@/lib/design/publicSurface";

export type AbraxasJourneyVisualState =
  | "ready"
  | "waiting_wallet"
  | "verifying"
  | "preparing_workspace"
  | "running_test"
  | "verified"
  | "needs_attention";

const STATE_LABEL: Record<AbraxasJourneyVisualState, string> = {
  ready: "Ready",
  waiting_wallet: "Waiting for wallet",
  verifying: "Verifying",
  preparing_workspace: "Preparing workspace",
  running_test: "Running test",
  verified: "Verified",
  needs_attention: "Needs attention",
};

const PENDING: AbraxasJourneyVisualState[] = [
  "waiting_wallet",
  "verifying",
  "preparing_workspace",
  "running_test",
];

export function AbraxasJourneyEmblemStatus({
  state,
  detail,
}: {
  state: AbraxasJourneyVisualState;
  detail?: string;
}) {
  const pending = PENDING.includes(state);
  return (
    <div
      className={`abx-journey-emblem${pending ? " abx-journey-emblem--pending" : ""}`}
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.55rem",
        margin: "0 0 1rem",
        fontFamily: PUBLIC_FONT_SANS,
      }}
    >
      <AbraxasLogo variant="emblem" emblemOnly emblemSize={44} href={undefined} />
      <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "var(--abx-green, #3ecf8e)" }}>
        {STATE_LABEL[state]}
      </p>
      {detail ? (
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-secondary)", textAlign: "center", maxWidth: 420 }}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}
