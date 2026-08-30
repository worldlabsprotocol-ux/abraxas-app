// FILE: lib/idv/ageEligibility.ts
// Server-side age eligibility from authoritative IDV DOB — never expose DOB or computed age.

export const PRODUCT_ELIGIBILITY_OVER_21 = "over_21" as const;

export type ProductEligibilityOutcome = typeof PRODUCT_ELIGIBILITY_OVER_21;

export type AgeEligibilityFailureReason =
  | "missing"
  | "invalid"
  | "future"
  | "under_minimum";

export interface AgeEligibilityEvaluation {
  eligible: boolean;
  failureReason?: AgeEligibilityFailureReason;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse an authoritative document DOB (YYYY-MM-DD). Returns null for malformed or future dates.
 * Never log the input or output — use only for internal eligibility derivation.
 */
export function parseAuthoritativeDateOfBirth(raw: string): Date | null {
  const trimmed = raw.trim();
  const match = ISO_DATE_PATTERN.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  const todayUtc = new Date();
  const today = new Date(Date.UTC(
    todayUtc.getUTCFullYear(),
    todayUtc.getUTCMonth(),
    todayUtc.getUTCDate(),
  ));
  if (date.getTime() > today.getTime()) return null;

  return date;
}

function ageInWholeYears(dob: Date, asOf: Date): number {
  const asOfUtc = new Date(Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate(),
  ));
  let age = asOfUtc.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = asOfUtc.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && asOfUtc.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** Evaluate whether DOB satisfies minimum_age. Does not return or persist DOB or age. */
export function evaluateAgeEligibilityFromDateOfBirth(
  dob: Date,
  minimumAge: number,
  asOf: Date = new Date(),
): AgeEligibilityEvaluation {
  if (minimumAge < 1) {
    return { eligible: false, failureReason: "invalid" };
  }
  const age = ageInWholeYears(dob, asOf);
  if (age < minimumAge) {
    return { eligible: false, failureReason: "under_minimum" };
  }
  return { eligible: true };
}

/** Fail-closed eligibility from raw authoritative document DOB string. */
export function evaluateAgeEligibilityFromDocumentDate(
  raw: string | null | undefined,
  minimumAge: number,
  asOf: Date = new Date(),
): AgeEligibilityEvaluation {
  if (raw == null || raw.trim() === "") {
    return { eligible: false, failureReason: "missing" };
  }

  const trimmed = raw.trim();
  if (ISO_DATE_PATTERN.test(trimmed)) {
    const year = Number(trimmed.slice(0, 4));
    const month = Number(trimmed.slice(5, 7));
    const day = Number(trimmed.slice(8, 10));
    const candidate = new Date(Date.UTC(year, month - 1, day));
    const todayUtc = new Date();
    const today = new Date(Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate(),
    ));
    if (
      candidate.getUTCFullYear() === year
      && candidate.getUTCMonth() === month - 1
      && candidate.getUTCDate() === day
      && candidate.getTime() > today.getTime()
    ) {
      return { eligible: false, failureReason: "future" };
    }
  }

  const dob = parseAuthoritativeDateOfBirth(trimmed);
  if (!dob) {
    return { eligible: false, failureReason: "invalid" };
  }

  return evaluateAgeEligibilityFromDateOfBirth(dob, minimumAge, asOf);
}
