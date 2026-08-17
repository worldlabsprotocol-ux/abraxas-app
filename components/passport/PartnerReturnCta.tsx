"use client";
// FILE: components/passport/PartnerReturnCta.tsx
// Partner-flow return control — uses shared handoff.complete(), never raw return href.

import { Btn } from "@/components/redesign/ui";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";

interface Props {
  handoff: PartnerFlowHandoffController;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "tertiary";
  fullWidth?: boolean;
}

export function PartnerReturnCta({
  handoff,
  label = "Return to partner app →",
  size = "sm",
  variant = "primary",
  fullWidth = false,
}: Props) {
  if (!handoff.isPartnerFlowContext) return null;

  const disabled = handoff.inFlight || !handoff.ready;

  return (
    <Btn
      size={size}
      variant={variant}
      fullWidth={fullWidth}
      disabled={disabled}
      loading={handoff.inFlight}
      onClick={() => void handoff.complete()}
    >
      {label}
    </Btn>
  );
}
