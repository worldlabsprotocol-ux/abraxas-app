// FILE: lib/assurance/selfAttestation/calculateAgeBand.test.ts

import { describe, expect, it } from "vitest";

import {
  ageInWholeYearsUtc,
  deriveSelfAttestedAgeBand,
  parseIsoDateUtc,
  utcToday,
} from "./calculateAgeBand";

const MIN_AGE = 21;

function dobYearsAgo(years: number, asOf: string): string {
  const asOfDate = utcToday(new Date(asOf));
  const y = asOfDate.getUTCFullYear() - years;
  const m = String(asOfDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(asOfDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("parseIsoDateUtc + deriveSelfAttestedAgeBand (UTC, server-authoritative)", () => {
  const asOf = "2026-10-09T15:30:00-07:00";

  it("denies ages 17, 18, and 20 at L0 minimum 21", () => {
    for (const years of [17, 18, 20]) {
      const dob = dobYearsAgo(years, asOf);
      const parsed = parseIsoDateUtc(dob);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(
        deriveSelfAttestedAgeBand(parsed.dobUtc, MIN_AGE, utcToday(new Date(asOf))),
      ).toBe("under_21");
    }
  });

  it("allows exactly 21 whole years on the as-of UTC calendar day", () => {
    const dob = dobYearsAgo(21, asOf);
    const parsed = parseIsoDateUtc(dob);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      deriveSelfAttestedAgeBand(parsed.dobUtc, MIN_AGE, utcToday(new Date(asOf))),
    ).toBe("over_21");
  });

  it("denies when the 21st birthday is tomorrow (UTC)", () => {
    const dob = dobYearsAgo(21, asOf);
    const parsed = parseIsoDateUtc(dob);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const dayBefore = utcToday(new Date(asOf));
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    expect(deriveSelfAttestedAgeBand(parsed.dobUtc, MIN_AGE, dayBefore)).toBe("under_21");
  });

  it("handles leap-day birthdays on Feb 28 and Mar 1 boundaries (UTC)", () => {
    const leapDob = parseIsoDateUtc("2004-02-29");
    expect(leapDob.ok).toBe(true);
    if (!leapDob.ok) return;

    expect(
      deriveSelfAttestedAgeBand(
        leapDob.dobUtc,
        MIN_AGE,
        utcToday(new Date("2025-03-01T12:00:00Z")),
      ),
    ).toBe("over_21");

    expect(
      deriveSelfAttestedAgeBand(
        leapDob.dobUtc,
        MIN_AGE,
        utcToday(new Date("2025-02-28T12:00:00Z")),
      ),
    ).toBe("under_21");
  });

  it("uses UTC calendar day for as-of, not local wall-clock alone", () => {
    const parsed = parseIsoDateUtc("2000-01-01");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      deriveSelfAttestedAgeBand(
        parsed.dobUtc,
        MIN_AGE,
        utcToday(new Date("2021-01-01T00:00:00Z")),
      ),
    ).toBe("over_21");
    expect(
      deriveSelfAttestedAgeBand(
        parsed.dobUtc,
        MIN_AGE,
        utcToday(new Date("2020-12-31T23:59:59Z")),
      ),
    ).toBe("under_21");
  });

  it("rejects missing, malformed, invalid, future, and implausible DOB", () => {
    expect(parseIsoDateUtc("").ok).toBe(false);
    expect(parseIsoDateUtc("01-01-2000").ok).toBe(false);
    expect(parseIsoDateUtc("2000-13-01").ok).toBe(false);
    expect(parseIsoDateUtc("2000-02-30").ok).toBe(false);

    const tomorrow = utcToday(new Date());
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const futureDob = `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;
    expect(parseIsoDateUtc(futureDob).ok).toBe(false);

    expect(parseIsoDateUtc("1900-01-01").ok).toBe(false);
  });

  it("ageInWholeYearsUtc matches deriveSelfAttestedAgeBand threshold", () => {
    const parsed = parseIsoDateUtc("2005-10-09");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const today = utcToday(new Date("2026-10-09T00:00:00Z"));
    expect(ageInWholeYearsUtc(parsed.dobUtc, today)).toBe(21);
    expect(deriveSelfAttestedAgeBand(parsed.dobUtc, MIN_AGE, today)).toBe("over_21");
  });
});
