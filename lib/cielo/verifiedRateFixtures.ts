// FILE: lib/cielo/verifiedRateFixtures.ts
// Test fixtures for approved / manual_review / not_eligible UI states.

export type VerifiedRateFixture = "approved" | "manual_review" | "not_eligible";

const VALID: VerifiedRateFixture[] = ["approved", "manual_review", "not_eligible"];

export function getVerifiedRateFixture(): VerifiedRateFixture | null {
  const raw = process.env.CIELO_VERIFIED_RATE_FIXTURE?.trim().toLowerCase();
  if (!raw) return null;
  return VALID.includes(raw as VerifiedRateFixture) ? (raw as VerifiedRateFixture) : null;
}

export function parseVerifiedRateFixture(input: string | null | undefined): VerifiedRateFixture | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  return VALID.includes(raw as VerifiedRateFixture) ? (raw as VerifiedRateFixture) : null;
}

export const VERIFIED_RATE_FIXTURE_LABELS: Record<VerifiedRateFixture, string> = {
  approved: "Verified Rate Eligible (fixture)",
  manual_review: "Manual Review (fixture)",
  not_eligible: "Not Eligible (fixture)",
};
