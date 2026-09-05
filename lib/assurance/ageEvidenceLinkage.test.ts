// FILE: lib/assurance/ageEvidenceLinkage.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as ageEvidence from "@/lib/assurance/ageEvidence";
import {
  finalizeAgeEvidenceLinkage,
  precheckAgeEvidenceLinkage,
  requiresAgeEvidenceLinkage,
} from "@/lib/assurance/ageEvidenceLinkage";

describe("ageEvidenceLinkage", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires linkage only for age gate 21+", () => {
    expect(requiresAgeEvidenceLinkage(21)).toBe(true);
    expect(requiresAgeEvidenceLinkage(18)).toBe(false);
    expect(requiresAgeEvidenceLinkage(null)).toBe(false);
  });

  it("sandbox continues when storage unavailable", async () => {
    vi.spyOn(ageEvidence, "checkAgeEvidenceStorageAvailability").mockResolvedValue({
      available: false,
      reason: "table_missing",
    });

    const result = await precheckAgeEvidenceLinkage({ sandboxOnly: true, minimumAgeGate: 21 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sandbox_only).toBe(true);
    expect(console.warn).toHaveBeenCalled();
  });

  it("production rejects when storage unavailable", async () => {
    vi.spyOn(ageEvidence, "checkAgeEvidenceStorageAvailability").mockResolvedValue({
      available: false,
      reason: "table_missing",
    });

    const result = await precheckAgeEvidenceLinkage({ sandboxOnly: false, minimumAgeGate: 21 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toContain("unavailable");
    }
  });

  it("production rejects when post-issuance linkage fails", () => {
    const result = finalizeAgeEvidenceLinkage({
      sandboxOnly: false,
      minimumAgeGate: 21,
      evidence: { ok: false, error: "insert failed" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("sandbox warns but continues when post-issuance linkage unavailable", () => {
    const result = finalizeAgeEvidenceLinkage({
      sandboxOnly: true,
      minimumAgeGate: 21,
      evidence: { ok: false, error: "age_evidence_storage_unavailable", storage_unavailable: true },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.storage_unavailable).toBe(true);
  });
});
