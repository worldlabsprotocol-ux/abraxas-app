// FILE: lib/admin/adminConfirmCopy.ts
// Fixed confirmation copy registry for admin mutation dialogs (UI only).

import { REVOCATION_REASON_CODES } from "@/lib/decisionReceipts/revocationControlPlane";

export type AdminConfirmRisk = "low" | "medium" | "high";

export type AdminConfirmActionKey =
  | "identity.approve"
  | "identity.reject"
  | "receipt.revoke"
  | "partner_key.revoke"
  | "partner_key.issue"
  | "privacy.approve_deletion"
  | "privacy.approve_export"
  | "privacy.deny"
  | "privacy.legal_hold"
  | "webhook.rotate_secret"
  | "policy.publish"
  | "revocation.partner_scoped"
  | "design_partner.promote"
  | "design_partner.reject";

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
  "webhook.rotate_secret": {
    title: "Rotate webhook signing secret?",
    body:
      "This generates a new signing secret for partner {{partnerId}}. "
      + "The previous secret will no longer verify webhook signatures. "
      + "The new secret is returned once in the rotation response. "
      + "Store it in your approved secret manager immediately. Delivery enable/disable is unchanged.",
    confirmLabel: "Rotate signing secret",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
  "policy.publish": {
    title: "Publish partner policy draft?",
    body:
      "This publishes {{policyId}} v{{version}} for partner {{partnerId}}. "
      + "The draft becomes the active policy and is immutable after publish. "
      + "A previously active version may be deprecated.",
    confirmLabel: "Publish policy",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
  "revocation.partner_scoped": {
    title: "Revoke partner-scoped access?",
    body:
      "This revokes {{activeReceiptCount}} active receipt(s) for partner {{partnerId}} on this subject. "
      + "Other partners' receipts are not affected. Credential claims are not globally revoked. "
      + "Reason: {{reasonCode}}. Restoring access requires a new valid issuance flow.",
    confirmLabel: "Revoke partner access",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: true,
    reasonCodeOptions: REVOCATION_REASON_CODES,
  },
  "design_partner.promote": {
    title: "Promote design partner application?",
    body:
      "This creates partner org {{partnerId}} for {{company}} and issues a sandbox API key (abx_test_). "
      + "The application is marked onboarded. The API key is shown once — "
      + "store it in your approved secret manager immediately.",
    confirmLabel: "Promote and issue sandbox key",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
  "design_partner.reject": {
    title: "Reject this design partner application?",
    body:
      "This marks {{company}} as rejected. No partner org, API key, or policy will be created. "
      + "The application record is kept for audit.",
    confirmLabel: "Reject application",
    cancelLabel: "Cancel",
    risk: "high",
    requireNote: false,
    noteOptional: false,
    requireReasonCode: false,
  },
  "partner_key.issue": {
    title: "Issue partner API key?",
    body:
      "This generates a new {{keyEnvironment}} API key (abx_{{keyEnvironment}}_) for partner {{partnerId}}. "
      + "The raw key is shown once after creation. Existing keys are not revoked automatically. "
      + "Store it in your approved secret manager immediately.",
    confirmLabel: "Issue API key",
    cancelLabel: "Cancel",
    risk: "high",
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
