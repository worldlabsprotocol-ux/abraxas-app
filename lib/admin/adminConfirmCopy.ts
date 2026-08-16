// FILE: lib/admin/adminConfirmCopy.ts
// Fixed confirmation copy registry for admin mutation dialogs (UI only).

import { REVOCATION_REASON_CODES } from "@/lib/decisionReceipts/revocationControlPlane";

export type AdminConfirmRisk = "low" | "medium" | "high";

export type AdminConfirmActionKey =
  | "identity.approve"
  | "identity.reject"
  | "receipt.revoke"
  | "partner_key.revoke"
  | "privacy.approve_deletion"
  | "privacy.approve_export"
  | "privacy.deny"
  | "privacy.legal_hold";

export interface AdminConfirmCopy {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  risk: AdminConfirmRisk;
  requireNote: boolean;
  noteOptional: boolean;
  notePlaceholder?: string;
  requireReasonCode: boolean;
  reasonCodeOptions?: readonly string[];
}

export const ADMIN_CONFIRM_COPY: Record<AdminConfirmActionKey, AdminConfirmCopy> = {
  "identity.approve": {
    title: "Approve identity verification?",
    body:
      "This will issue an L{{assuranceLevel}} credential and write an audit event for {{subjectLabel}}. "
      + "The holder can use this credential in partner flows. This cannot be undone from the admin UI.",
    confirmLabel: "Approve and issue credential",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: true,
    notePlaceholder: "Reviewer notes (optional, stored in audit log)",
    requireReasonCode: false,
  },
  "identity.reject": {
    title: "Reject this identity submission?",
    body:
      "This rejects {{subjectLabel}}'s verification submission. "
      + "The holder will need to start a new verification flow.",
    confirmLabel: "Reject submission",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: true,
    notePlaceholder: "Rejection reason for audit log (optional)",
    requireReasonCode: false,
  },
  "receipt.revoke": {
    title: "Revoke decision receipt?",
    body:
      "Receipt {{receiptId}} will immediately stop working for live partner validation. "
      + "The signed artifact remains cryptographically valid; only live validity becomes revoked. "
      + "Reason: {{reasonCode}}.",
    confirmLabel: "Revoke receipt",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: true,
    reasonCodeOptions: REVOCATION_REASON_CODES,
  },
  "partner_key.revoke": {
    title: "Revoke partner API key?",
    body:
      "Key {{keyPrefix}}… for partner {{partnerId}} will stop working immediately. "
      + "Any integration using this key will fail until a new key is issued.",
    confirmLabel: "Revoke API key",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
  "privacy.approve_deletion": {
    title: "Approve account deletion?",
    body:
      "This revokes Passport access and credentials for this holder. "
      + "Storage blobs and audit records are not automatically purged. "
      + "Physical deletion remains subject to retention policy.",
    confirmLabel: "Revoke access",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
  "privacy.approve_export": {
    title: "Approve data export request?",
    body:
      "This approves the holder's data export request (ref {{requestRef}}). "
      + "It does not deliver an export automatically — follow your privacy runbook for fulfillment.",
    confirmLabel: "Approve export",
    cancelLabel: "Cancel",
    risk: "medium",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
  "privacy.deny": {
    title: "Deny privacy request?",
    body: "This sets request ref {{requestRef}} ({{requestType}}) to denied status.",
    confirmLabel: "Deny request",
    cancelLabel: "Cancel",
    risk: "medium",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
  "privacy.legal_hold": {
    title: "Place legal hold?",
    body: "This places request ref {{requestRef}} on legal hold and pauses deletion processing.",
    confirmLabel: "Apply legal hold",
    cancelLabel: "Cancel",
    risk: "medium",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
};

export function interpolateConfirmCopy(
  template: string,
  context: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(context[key] ?? ""));
}

export function getAdminConfirmCopy(actionKey: AdminConfirmActionKey): AdminConfirmCopy {
  return ADMIN_CONFIRM_COPY[actionKey];
}
