// Maps protocol / operational states to shared UI tones (fail-closed, no decorative blockchain UI).

import type { AbxStatusTone } from "@/lib/design/abraxasDesignSystem";

export type ProtocolEvidenceKind =
  | "verified_independent"
  | "signed_receipt"
  | "policy_evaluated"
  | "revoked"
  | "expired"
  | "pending"
  | "blocked"
  | "devnet_labeled"
  | "unavailable"
  | "unverified";

const TONE_BY_KIND: Record<ProtocolEvidenceKind, AbxStatusTone> = {
  verified_independent: "success",
  signed_receipt: "success",
  policy_evaluated: "info",
  revoked: "error",
  expired: "warning",
  pending: "pending",
  blocked: "error",
  devnet_labeled: "warning",
  unavailable: "neutral",
  unverified: "neutral",
};

export function protocolStateTone(kind: ProtocolEvidenceKind): AbxStatusTone {
  return TONE_BY_KIND[kind];
}

export function protocolStateLabel(kind: ProtocolEvidenceKind): string {
  switch (kind) {
    case "verified_independent":
      return "Independently verifiable";
    case "signed_receipt":
      return "Signed receipt";
    case "policy_evaluated":
      return "Policy evaluated";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    case "pending":
      return "Pending";
    case "blocked":
      return "Blocked";
    case "devnet_labeled":
      return "Devnet evidence";
    case "unavailable":
      return "Unavailable";
    case "unverified":
      return "Unverified";
    default:
      return "Unknown";
  }
}
