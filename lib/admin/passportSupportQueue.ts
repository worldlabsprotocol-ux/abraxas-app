// FILE: lib/admin/passportSupportQueue.ts
// Strict mapping from generic contact rows into the operator Passport support queue.

import {
  isPassportSupportIssue,
  passportSupportIssueLabel,
  type PassportSupportIssue,
} from "@/lib/passport/passportSupport";

export interface AdminPassportSupportItem {
  reference: string;
  email: string;
  issue_type: PassportSupportIssue;
  issue_label: string;
  message: string;
  status: "received";
  submitted_at: string;
}

const PREFIX = "passport-support:";
const STORED_MESSAGE = /^\[(PS-[A-Z0-9]{10})\]\s[^\n]*\n\n([\s\S]+)$/;

export function toAdminPassportSupportItem(row: {
  email?: unknown;
  category?: unknown;
  message?: unknown;
  created_at?: unknown;
}): AdminPassportSupportItem | null {
  if (
    typeof row.email !== "string" ||
    !row.email.includes("@") ||
    typeof row.category !== "string" ||
    !row.category.startsWith(PREFIX) ||
    typeof row.message !== "string" ||
    typeof row.created_at !== "string"
  ) return null;

  const issueType = row.category.slice(PREFIX.length);
  if (!isPassportSupportIssue(issueType)) return null;

  const match = STORED_MESSAGE.exec(row.message);
  const reference = match?.[1];
  const message = match?.[2]?.trim();
  if (!reference || !message) return null;

  return {
    reference,
    email: row.email,
    issue_type: issueType,
    issue_label: passportSupportIssueLabel(issueType),
    message,
    status: "received",
    submitted_at: row.created_at,
  };
}
