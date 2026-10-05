import { describe, expect, it } from "vitest";
import { parsePartnerFlowInstant } from "@/lib/partner/parsePartnerFlowInstant";

describe("parsePartnerFlowInstant", () => {
  it("parses ISO Z timestamps", () => {
    expect(parsePartnerFlowInstant("2026-10-05T10:24:48.399Z")).toBe(
      Date.parse("2026-10-05T10:24:48.399Z"),
    );
  });

  it("parses Postgres timestamptz with +00 offset", () => {
    const ms = parsePartnerFlowInstant("2026-10-05T10:24:48.399+00");
    expect(ms).not.toBeNull();
    expect(Date.parse("2026-10-05T10:24:48.399Z")).toBe(ms);
  });

  it("parses Postgres timestamptz with space separator", () => {
    const ms = parsePartnerFlowInstant("2026-10-05 10:24:48.399+00");
    expect(ms).not.toBeNull();
    expect(Date.parse("2026-10-05T10:24:48.399Z")).toBe(ms);
  });

  it("returns null for empty or unparseable values", () => {
    expect(parsePartnerFlowInstant("")).toBeNull();
    expect(parsePartnerFlowInstant("not-a-date")).toBeNull();
  });
});
