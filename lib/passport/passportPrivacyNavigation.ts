// FILE: lib/passport/passportPrivacyNavigation.ts
// Stable holder-facing navigation for Passport privacy controls.

export type PassportPageView = "passport" | "verify" | "privacy" | "support";

export const PASSPORT_PRIVACY_HREF = "/passport?view=privacy" as const;
export const PASSPORT_SUPPORT_HREF = "/passport?view=support" as const;

export function resolvePassportPageView(view: string | null): PassportPageView {
  if (view === "verify" || view === "privacy" || view === "support") return view;
  return "passport";
}
