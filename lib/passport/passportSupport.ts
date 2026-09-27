// FILE: lib/passport/passportSupport.ts
// Stable validation, workflow status, and holder-safe history for Passport support requests.

export const PASSPORT_SUPPORT_ISSUES = [
  { value: "account_access", label: "Sign-in or account access" },
  { value: "verification", label: "Identity verification" },
  { value: "partner_request", label: "Shared result or partner request" },
  { value: "privacy", label: "Privacy request" },
  { value: "other", label: "Something else" },
] as const;

export const PASSPORT_SUPPORT_STATUSES = [
  { value: "received", label: "Received" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
] as const;

export type PassportSupportIssue = (typeof PASSPORT_SUPPORT_ISSUES)[number]["value"];
export type PassportSupportStatus = (typeof PASSPORT_SUPPORT_STATUSES)[number]["value"];

export interface PassportSupportHistoryItem {
  reference: string;
  issue_type: PassportSupportIssue;
  issue_label: string;
  status: PassportSupportStatus;
  status_label: string;
  submitted_at: string;
}

const ISSUE_VALUES = new Set<string>(PASSPORT_SUPPORT_ISSUES.map(issue => issue.value));
const STATUS_VALUES = new Set<string>(PASSPORT_SUPPORT_STATUSES.map(status => status.value));
const SUPPORT_CATEGORY_PREFIX = "passport-support:";
const SUPPORT_REFERENCE = /^\[(PS-[A-Z0-9]{10})\]/;

export const PASSPORT_SUPPORT_MESSAGE_MIN = 10;
export const PASSPORT_SUPPORT_MESSAGE_MAX = 2000;

export function isPassportSupportIssue(value: unknown): value is PassportSupportIssue {
  return typeof value === "string" && ISSUE_VALUES.has(value);
}

export function isPassportSupportStatus(value: unknown): value is PassportSupportStatus {
  return typeof value === "string" && STATUS_VALUES.has(value);
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

export function passportSupportStatusLabel(status: PassportSupportStatus): string {
  return PASSPORT_SUPPORT_STATUSES.find(item => item.value === status)?.label ?? "Received";
}

export function passportSupportCategory(
  issue: PassportSupportIssue,
  status: PassportSupportStatus = "received",
): string {
  return `${SUPPORT_CATEGORY_PREFIX}${issue}:${status}`;
}

export function parsePassportSupportCategory(value: unknown): {
  issue: PassportSupportIssue;
  status: PassportSupportStatus;
} | null {
  if (typeof value !== "string" || !value.startsWith(SUPPORT_CATEGORY_PREFIX)) return null;
  const parts = value.slice(SUPPORT_CATEGORY_PREFIX.length).split(":");
  if (parts.length < 1 || parts.length > 2 || !isPassportSupportIssue(parts[0])) return null;
  const status = parts[1] ?? "received";
  if (!isPassportSupportStatus(status)) return null;
  return { issue: parts[0], status };
}

export function passportSupportReferenceFromMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return SUPPORT_REFERENCE.exec(value)?.[1] ?? null;
}

export function passportSupportBodyFromMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  const separator = value.indexOf("\n\n");
  return separator >= 0 ? value.slice(separator + 2).trim() : "";
}

export function toPassportSupportHistoryItem(row: {
  category?: unknown;
  message?: unknown;
  created_at?: unknown;
}): PassportSupportHistoryItem | null {
  const category = parsePassportSupportCategory(row.category);
  if (!category || typeof row.created_at !== "string") return null;
  const reference = passportSupportReferenceFromMessage(row.message);
  if (!reference) return null;

  return {
    reference,
    issue_type: category.issue,
    issue_label: passportSupportIssueLabel(category.issue),
    status: category.status,
    status_label: passportSupportStatusLabel(category.status),
    submitted_at: row.created_at,
  };
}
