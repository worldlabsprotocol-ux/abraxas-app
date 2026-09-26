// FILE: lib/passport/passportPrivacyNavigation.ts
// Stable holder-facing navigation for Passport privacy controls.

export type PassportPageView = "passport" | "verify" | "privacy";

export const PASSPORT_PRIVACY_HREF = "/passport?view=privacy" as const;

export function resolvePassportPageView(view: string | null): PassportPageView {
  if (view === "verify" || view === "privacy") return view;
  return "passport";
}
