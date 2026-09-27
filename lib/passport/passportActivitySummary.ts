// FILE: lib/passport/passportActivitySummary.ts
// Plain-language account activity assembled from holder-safe API views only.

import type { PassportSupportHistoryItem } from "@/lib/passport/passportSupport";
import type { HolderPrivacyRequestView } from "@/lib/privacy/types";

export type PassportAccountActivityKind = "privacy" | "support";

export interface PassportAccountActivityItem {
  id: string;
  kind: PassportAccountActivityKind;
  title: string;
  status: string;
  occurred_at: string;
  href: string;
  action_label: string;
}

function privacyTitle(requestType: HolderPrivacyRequestView["request_type"]): string {
  return requestType === "data_export" ? "Data export requested" : "Account deletion requested";
}

export function buildPassportAccountActivity(input: {
  privacyRequests: HolderPrivacyRequestView[];
  supportRequests: PassportSupportHistoryItem[];
}): PassportAccountActivityItem[] {
  const privacy = input.privacyRequests.map((request, index): PassportAccountActivityItem => ({
    id: `privacy:${request.request_type}:${request.created_at}:${index}`,
    kind: "privacy",
    title: privacyTitle(request.request_type),
    status: request.status_label,
    occurred_at: request.updated_at || request.created_at,
    href: "/passport?view=privacy",
    action_label: "Open privacy controls",
  }));

  const support = input.supportRequests.map((request): PassportAccountActivityItem => ({
    id: `support:${request.reference}`,
    kind: "support",
    title: request.issue_label,
    status: request.status_label,
    occurred_at: request.submitted_at,
    href: "/passport?view=support",
    action_label: "Open help and safety",
  }));

  return [...privacy, ...support]
    .filter(item => !Number.isNaN(Date.parse(item.occurred_at)))
    .sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at))
    .slice(0, 20);
}
