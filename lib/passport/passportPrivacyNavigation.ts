// FILE: lib/passport/passportPrivacyNavigation.ts
// Stable holder-facing navigation for Passport account tools.

export type PassportPageView = "passport" | "requests" | "activity" | "verify" | "privacy" | "support";

export const PASSPORT_REQUESTS_HREF = "/passport?view=requests" as const;
export const PASSPORT_ACTIVITY_HREF = "/passport?view=activity" as const;
export const PASSPORT_PRIVACY_HREF = "/passport?view=privacy" as const;
export const PASSPORT_SUPPORT_HREF = "/passport?view=support" as const;

export function resolvePassportPageView(view: string | null): PassportPageView {
  if (
    view === "requests"
    || view === "activity"
    || view === "verify"
    || view === "privacy"
    || view === "support"
  ) return view;
  return "passport";
}
