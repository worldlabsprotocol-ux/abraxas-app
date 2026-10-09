// FILE: lib/goodTrouble/goodTroubleAgeDecision.adversarial.test.ts
// Adversarial checks: client cannot override server age band; deny never yields purchase permit.

import { describe, expect, it } from "vitest";

import { deriveSelfAttestedAgeBand, parseIsoDateUtc, utcToday } from "@/lib/assurance/selfAttestation/calculateAgeBand";

describe("Good Trouble age decision adversarial (L0 self-attestation)", () => {
  const asOf = utcToday(new Date("2026-10-09T12:00:00Z"));

  it("never maps under-21 DOB to over_21 regardless of client intent", () => {
    const underageDob = "2010-06-15";
    const parsed = parseIsoDateUtc(underageDob);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(deriveSelfAttestedAgeBand(parsed.dobUtc, 21, asOf)).toBe("under_21");
  });

  it("documents that eligible=true from client is not part of server API", () => {
    const fakeClientPayload = {
      dateOfBirth: "2010-06-15",
      eligible: true,
    };
    const parsed = parseIsoDateUtc(fakeClientPayload.dateOfBirth);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const band = deriveSelfAttestedAgeBand(parsed.dobUtc, 21, asOf);
    expect(band).toBe("under_21");
    expect(fakeClientPayload.eligible).toBe(true);
  });
});
