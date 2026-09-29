// FILE: lib/demo/relyingPartyPilot/receiptInspector.ts
// Safe receipt inspector fields for judges and integrators.

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { RELYING_PARTY_PILOT_FORBIDDEN_PARTNER_FIELDS } from "./contract";
import type { PilotReceiptInspectorField, PilotVerificationResult } from "./types";

export type { PilotReceiptInspectorField };

export function buildReceiptInspectorFields(input: {
  verification: Pick<PilotVerificationResult, "receipt" | "partner_visible" | "cryptographically_verified">;
  purpose: string;
  partner_name: string;
}): PilotReceiptInspectorField[] {
  const receipt = input.verification.receipt;
  const visible = input.verification.partner_visible;
  if (!receipt || !visible) return [];

  return [
    { label: "Verification status", value: input.verification.cryptographically_verified ? "Cryptographically verified Abraxas receipt" : "Not verified" },
    { label: "Result", value: String(visible.result ?? "unknown") },
    { label: "Policy", value: String(visible.policy ?? receipt.policy_id) },
    { label: "Policy version", value: String(visible.policy_version ?? "—") },
    { label: "Relying partner", value: input.partner_name },
    { label: "Purpose", value: input.purpose },
    { label: "Issued at", value: String(visible.issued_at ?? "—") },
    { label: "Expires at", value: String(visible.expires_at ?? "—") },
    { label: "Receipt ID", value: String(visible.receipt_id ?? receipt.receipt_id ?? "—") },
    { label: "Currently valid", value: String(receipt.currently_valid) },
    { label: "Replay note", value: "Each partner request requires its own current receipt bound to that partner and policy." },
  ];
}

export function pilotPayloadLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  return RELYING_PARTY_PILOT_FORBIDDEN_PARTNER_FIELDS.filter((needle) => blob.includes(needle.toLowerCase()));
}
