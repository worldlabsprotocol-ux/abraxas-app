// FILE: lib/passport/passportSupport.ts
// Stable validation and labels for session-bound Passport support requests.

export const PASSPORT_SUPPORT_ISSUES = [
  { value: "account_access", label: "Sign-in or account access" },
  { value: "verification", label: "Identity verification" },
  { value: "partner_request", label: "Shared result or partner request" },
  { value: "privacy", label: "Privacy request" },
  { value: "other", label: "Something else" },
] as const;

export type PassportSupportIssue = (typeof PASSPORT_SUPPORT_ISSUES)[number]["value"];

const ISSUE_VALUES = new Set<string>(PASSPORT_SUPPORT_ISSUES.map(issue => issue.value));
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
