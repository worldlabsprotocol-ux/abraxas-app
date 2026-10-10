"use client";

import { resolvePassportHolderJourneyStatus } from "@/lib/passport/passportHolderJourneyStatus";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function PassportHolderNextStep(props: {
  walletDone: boolean;
  setup: PassportSetupState;
  identityStatus: IdentityStampStatus;
  hasCredential: boolean;
  idvProvider: "veriff" | "manual";
  via: string | null;
  partnerFlowActive?: boolean;
  startingVerification?: boolean;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  const journey = resolvePassportHolderJourneyStatus(props);

  return (
    <section
      aria-labelledby="passport-next-step-heading"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        padding: "1.15rem 1.25rem",
        marginBottom: "1rem",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
        {journey.stateLabel}
      </p>
      <h2 id="passport-next-step-heading" style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
        {journey.headline}
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.85rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
        {journey.nextAction}
      </p>
      {journey.progressSafe ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
          Your progress is saved to your signed-in wallet session.
        </p>
      ) : null}
      {props.primaryAction ? (
        <button
          type="button"
          disabled={props.primaryAction.disabled}
          onClick={props.primaryAction.onClick}
          style={{
            marginTop: "0.85rem",
            fontFamily: FONT,
            fontSize: "0.82rem",
            fontWeight: 700,
            padding: "0.55rem 1rem",
            borderRadius: 10,
            border: "none",
            cursor: props.primaryAction.disabled ? "not-allowed" : "pointer",
            background: "var(--accent)",
            color: "var(--accent-fg, #fff)",
          }}
        >
          {props.primaryAction.label}
        </button>
      ) : null}
    </section>
  );
}
