import { describe, expect, it } from "vitest";
import { canonicalPartnerFlowInstant, parsePartnerFlowInstant } from "@/lib/partner/parsePartnerFlowInstant";

const MATRIX = [
  { input: "2026-10-05T10:53:01.053Z", epoch: Date.parse("2026-10-05T10:53:01.053Z") },
  { input: "2026-10-05T10:53:01.053+00:00", epoch: Date.parse("2026-10-05T10:53:01.053+00:00") },
  { input: "2026-10-05T10:53:01.053+00", epoch: Date.parse("2026-10-05T10:53:01.053+00:00") },
  { input: "2026-10-05 10:53:01.053+00", epoch: Date.parse("2026-10-05 10:53:01.053+00") },
  { input: "2026-10-05 10:53:01.053+00:00", epoch: Date.parse("2026-10-05 10:53:01.053+00:00") },
  { input: "2026-10-05 10:53:01+00", epoch: Date.parse("2026-10-05 10:53:01+00") },
] as const;

describe("parsePartnerFlowInstant", () => {
  it.each(MATRIX)("parses $input", ({ input, epoch }) => {
    const ms = parsePartnerFlowInstant(input);
    expect(ms).toBe(epoch);
    expect(canonicalPartnerFlowInstant(input)).toBe(new Date(epoch).toISOString());
  });

  it("parses the exact live production continuation shape", () => {
    const production = "2026-10-05 10:53:01.053+00";
    const ms = parsePartnerFlowInstant(production);
    expect(ms).toBe(Date.parse("2026-10-05T10:53:01.053+00:00"));
    expect(canonicalPartnerFlowInstant(production)).toBe("2026-10-05T10:53:01.053Z");
  });

  it("documents Date.parse failure on PostgREST T+00 without :00", () => {
    expect(Number.isFinite(Date.parse("2026-10-05T10:53:01.053+00"))).toBe(false);
    expect(parsePartnerFlowInstant("2026-10-05T10:53:01.053+00")).not.toBeNull();
  });

  it("returns null for empty or unparseable values", () => {
    expect(parsePartnerFlowInstant("")).toBeNull();
    expect(parsePartnerFlowInstant("not-a-date")).toBeNull();
    expect(parsePartnerFlowInstant("2026-10-05T10:53:01.053+00:00.000")).toBeNull();
    expect(canonicalPartnerFlowInstant("not-a-date")).toBeNull();
  });
});
