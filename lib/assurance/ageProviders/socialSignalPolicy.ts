// FILE: lib/assurance/ageProviders/socialSignalPolicy.ts
// Social OAuth signals are non-authoritative — never satisfy age policy.

export type SocialProvider = "google" | "linkedin" | "facebook";

export interface SocialAccountSignal {
  provider: SocialProvider;
  authenticated: boolean;
  emailVerified?: boolean;
  accountSubjectHash?: string;
  /** Non-authoritative — must never be used for policy evaluation. */
  claimedBirthday?: string;
  accountAgeDays?: number;
}

export const SOCIAL_SIGNAL_REJECTED_CLAIMS = [
  "age_verified",
  "over_18",
  "over_21",
  "product_eligibility",
] as const;

export function socialSignalIsNonAuthoritativeForAge(
  signal: SocialAccountSignal,
): boolean {
  return signal.authenticated === true;
}

export function evaluateSocialSignalForAgePolicy(
  signal: SocialAccountSignal,
  requestedThreshold: 18 | 21,
): {
  satisfiesPolicy: false;
  reasonCode: string;
  riskHints: string[];
} {
  const riskHints: string[] = [];
  if (signal.emailVerified) riskHints.push("email_verified");
  if (signal.claimedBirthday) riskHints.push("claimed_birthday_present");
  if (signal.accountAgeDays != null) riskHints.push(`account_age_days:${signal.accountAgeDays}`);

  return {
    satisfiesPolicy: false,
    reasonCode: `social_${signal.provider}_not_age_proof`,
    riskHints,
  };
}

export function claimedSocialBirthdayCannotSatisfyPolicy(
  birthday: string | null | undefined,
  requestedThreshold: 18 | 21,
): boolean {
  if (!birthday?.trim()) return true;
  // Even if birthday would mathematically qualify, social-claimed DOB is never authoritative.
  void requestedThreshold;
  return true;
}

export function assertSocialSignalNotUsedAsAgeEvidence(
  claimType: string,
  evidenceSource?: string,
): void {
  if (SOCIAL_SIGNAL_REJECTED_CLAIMS.includes(claimType as typeof SOCIAL_SIGNAL_REJECTED_CLAIMS[number])) {
    if (evidenceSource?.startsWith("social_") || evidenceSource === "oauth_profile") {
      throw new Error("social_oauth_cannot_issue_age_claim");
    }
  }
}
