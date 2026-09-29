// FILE: lib/demo/relyingPartyPilot/types.ts

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

export interface PilotVerificationCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface PilotVerificationResult {
  allowed: boolean;
  outcome: string;
  reason_codes: string[];
  checks: PilotVerificationCheck[];
  receipt: PartnerFlowPublicReceipt | null;
  partner_visible: Record<string, unknown> | null;
  cryptographically_verified: boolean;
}

export interface PilotReceiptInspectorField {
  label: string;
  value: string;
}
