// FILE: lib/assurance/selfAttestation/calculateAgeBand.ts
// Transient UTC calendar-age calculation — DOB must not be logged or stored.

import type { SelfAttestedAgeBand } from "./constants";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DobValidationFailure =
  | "missing"
  | "invalid_format"
  | "invalid_date"
  | "future_date"
  | "implausible_age";

export type DobValidationResult =
  | {
      ok: true;
      dobUtc: Date;
    }
  | {
      ok: false;
      code: DobValidationFailure;
    };

export function parseIsoDateUtc(raw: string): DobValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, code: "missing" };

  const match = ISO_DATE_PATTERN.exec(trimmed);
  if (!match) return { ok: false, code: "invalid_format" };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { ok: false, code: "invalid_date" };
  }

  const dobUtc = new Date(Date.UTC(year, month - 1, day));
  if (
    dobUtc.getUTCFullYear() !== year
    || dobUtc.getUTCMonth() !== month - 1
    || dobUtc.getUTCDate() !== day
  ) {
    return { ok: false, code: "invalid_date" };
  }

  const todayUtc = utcToday();
  if (dobUtc.getTime() > todayUtc.getTime()) {
    return { ok: false, code: "future_date" };
  }

  const age = ageInWholeYearsUtc(dobUtc, todayUtc);
  if (age < 13 || age > 120) {
    return { ok: false, code: "implausible_age" };
  }

  return { ok: true, dobUtc };
}

export function utcToday(asOf: Date = new Date()): Date {
  return new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
}

/** Whole years elapsed on UTC calendar boundaries (leap-day safe). */
export function ageInWholeYearsUtc(dobUtc: Date, asOfUtc: Date): number {
  let age = asOfUtc.getUTCFullYear() - dobUtc.getUTCFullYear();
  const monthDelta = asOfUtc.getUTCMonth() - dobUtc.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && asOfUtc.getUTCDate() < dobUtc.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function deriveSelfAttestedAgeBand(
  dobUtc: Date,
  minimumAge: number,
  asOfUtc: Date = utcToday(),
): SelfAttestedAgeBand {
  const age = ageInWholeYearsUtc(dobUtc, asOfUtc);
  return age >= minimumAge ? "over_21" : "under_21";
}
