// FILE: lib/passport/passportSupport.ts
// Stable validation, labels, and holder-safe history for Passport support requests.

export const PASSPORT_SUPPORT_ISSUES = [
  { value: "account_access", label: "Sign-in or account access" },
  { value: "verification", label: "Identity verification" },
  { value: "partner_request", label: "Shared result or partner request" },
  { value: "privacy", label: "Privacy request" },
  { value: "other", label: "Something else" },
] as const;

export type PassportSupportIssue = (typeof PASSPORT_SUPPORT_ISSUES)[number]["value"];

export interface PassportSupportHistoryItem {
  reference: string;
  issue_type: PassportSupportIssue;
  issue_label: string;
  status: "received";
  status_label: "Received";
  submitted_at: string;
}

const ISSUE_VALUES = new Set<string>(PASSPORT_SUPPORT_ISSUES.map(issue => issue.value));
const SUPPORT_CATEGORY_PREFIX = "passport-support:";
const SUPPORT_REFERENCE = /^\[(PS-[A-Z0-9]{10})\]/;

export const PASSPORT_SUPPORT_MESSAGE_MIN = 10;
export const PASSPORT_SUPPORT_MESSAGE_MAX = 2000;

export function isPassportSupportIssue(value: unknown): value is PassportSupportIssue {
  return typeof value === "string" && ISSUE_VALUES.has(value);
}

export function normalizePassportSupportMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const message = value.trim();
  if (
    message.length < PASSPORT_SUPPORT_MESSAGE_MIN ||
    message.length > PASSPORT_SUPPORT_MESSAGE_MAX
  ) return null;
  return message;
}

export function passportSupportIssueLabel(issue: PassportSupportIssue): string {
  return PASSPORT_SUPPORT_ISSUES.find(item => item.value === issue)?.label ?? "Passport support";
}

export function toPassportSupportHistoryItem(row: {
  category?: unknown;
  message?: unknown;
  created_at?: unknown;
}): PassportSupportHistoryItem | null {
  if (typeof row.category !== "string" || !row.category.startsWith(SUPPORT_CATEGORY_PREFIX)) {
    return null;
  }
  const issueType = row.category.slice(SUPPORT_CATEGORY_PREFIX.length);
  if (!isPassportSupportIssue(issueType)) return null;
  if (typeof row.message !== "string" || typeof row.created_at !== "string") return null;

  const reference = SUPPORT_REFERENCE.exec(row.message)?.[1];
  if (!reference) return null;

  return {
    reference,
    issue_type: issueType,
    issue_label: passportSupportIssueLabel(issueType),
    status: "received",
    status_label: "Received",
    submitted_at: row.created_at,
  };
}
