// FILE: lib/passport/verificationActivity/contract.ts
// Holder-visible verification activity. No receipt, claim, or identity payloads.

export const PASSPORT_ACTIVITY_VERSION = "1.0.0" as const;
export const PASSPORT_ACTIVITY_LIMIT = 20 as const;
export const PASSPORT_ACTIVITY_WINDOW_DAYS = 180 as const;

export const PASSPORT_ACTIVITY_STATES = [
  "approved",
  "denied",
  "expired",
  "revoked",
  "sandbox_only",
] as const;
export type PassportActivityState = (typeof PASSPORT_ACTIVITY_STATES)[number];

export const PASSPORT_ACTIVITY_STATE_LABELS: Record<PassportActivityState, string> = {
  approved: "Approved",
  denied: "Denied",
  expired: "Expired",
  revoked: "Revoked",
  sandbox_only: "Sandbox-only",
};

export const PASSPORT_ACTIVITY_EMPTY =
  "No verification activity yet. When you approve a partner request, a summary appears here.";

export const PASSPORT_ACTIVITY_UNAVAILABLE =
  "Verification activity is temporarily unavailable. Return to Passport and try again.";

export const PASSPORT_ACTIVITY_NOTICE =
  "Partners receive only the policy result. Underlying evidence and personal data stay with you. An approved result is not universal access, an identity credential, or a payment authorization.";

export const PASSPORT_ACTIVITY_WITHHELD = [
  "underlying evidence",
  "government ID images",
  "date of birth",
  "legal name",
  "email",
  "selfies and biometric data",
] as const;

export const PASSPORT_ACTIVITY_DOCS = {
  passport: "/passport",
  explanation: "/docs/why-verification",
  partner_flow: "/docs/partner-flow",
} as const;

export const PASSPORT_ACTIVITY_CLIENT_ITEM_KEYS = [
  "activity_ref",
  "partner_label",
  "policy_label",
  "version_summary",
  "state",
  "state_label",
  "decided_at",
  "shared_result_category",
  "purpose",
  "partner_received",
  "withheld",
  "evidence_not_shared",
  "sandbox_only",
  "current",
  "recovery",
  "partner_entry_href",
] as const;

export const PASSPORT_ACTIVITY_CLIENT_VIEW_KEYS = [
  "version",
  "items",
  "truncated",
  "notice",
  "explanation_href",
  "passport_href",
] as const;

export interface PassportActivityItem {
  activity_ref: string;
  partner_label: string;
  policy_label: string;
  version_summary: string;
  state: PassportActivityState;
  state_label: string;
  decided_at: string;
  shared_result_category: string;
  purpose: string;
  partner_received: string;
  withheld: string[];
  evidence_not_shared: string;
  sandbox_only: boolean;
  current: boolean;
  recovery: string | null;
  partner_entry_href: string | null;
}

export interface PassportActivityView {
  version: typeof PASSPORT_ACTIVITY_VERSION;
  items: PassportActivityItem[];
  truncated: boolean;
  notice: string;
  explanation_href: string;
  passport_href: string;
}

export const PASSPORT_ACTIVITY_LEAK_PATTERN =
  /abx_(test|live|whsec)_|eyJ[A-Za-z0-9_-]{8,}|receipt_id|decision_id|0x[a-f0-9]{20,}|wallet_address|SQLSTATE|date of birth was shared|legal name was shared/i;
