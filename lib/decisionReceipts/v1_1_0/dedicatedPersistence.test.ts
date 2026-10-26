// FILE: lib/decisionReceipts/v1_1_0/dedicatedPersistence.test.ts

import { describe, expect, it } from "vitest";
import { EVIDENCE_COMMITMENT_SCHEMA } from "@/lib/decisionReceipts/schema/v1_1_0.constants";
import {
  collectDedicatedSidecarMismatches,
  readV11DedicatedColumnPresence,
  resolveAuthoritativeV11Field,
  shouldEnforceDedicatedSidecarParity,
  v11PersistenceContextFromRow,
} from "@/lib/decisionReceipts/v1_1_0/dedicatedPersistence";

const SAMPLE_COMMITMENT = {
  schema: EVIDENCE_COMMITMENT_SCHEMA,
  digest: "abc",
  entry_count: 0,
} as const;

describe("v1.1.0 dedicated persistence contract (migration 152)", () => {
  it("column absent: no dedicated vs sidecar enforcement", () => {
    expect(shouldEnforceDedicatedSidecarParity(false, "x", "final")).toBe(false);
    const reasons = collectDedicatedSidecarMismatches({
      persistence: {
        columns: {
          application_binding_ref: false,
          evidence_commitment: false,
          evidence_commitment_manifest: false,
          v11_issuance_phase: false,
        },
        issuance_phase: "final",
      },
      dedicated: { application_binding_ref: null },
      sidecar: { application_binding_ref: "signed-bind", evidence_commitment: null, evidence_commitment_manifest: null },
    });
    expect(reasons).toEqual([]);
  });

  it("column present, unbackfilled null, non-final: sidecar authoritative (no null vs non-null reject)", () => {
    expect(shouldEnforceDedicatedSidecarParity(true, null, null)).toBe(false);
    const reasons = collectDedicatedSidecarMismatches({
      persistence: {
        columns: {
          application_binding_ref: true,
          evidence_commitment: true,
          evidence_commitment_manifest: false,
          v11_issuance_phase: true,
        },
        issuance_phase: null,
      },
      dedicated: { application_binding_ref: null, evidence_commitment: null },
      sidecar: {
        application_binding_ref: "signed-bind",
        evidence_commitment: SAMPLE_COMMITMENT,
        evidence_commitment_manifest: null,
      },
    });
    expect(reasons).toEqual([]);
    expect(
      resolveAuthoritativeV11Field(null, "signed-bind", true, null),
    ).toBe("signed-bind");
  });

  it("column present, final phase: null dedicated vs signed sidecar is a mismatch", () => {
    const reasons = collectDedicatedSidecarMismatches({
      persistence: {
        columns: {
          application_binding_ref: true,
          evidence_commitment: true,
          evidence_commitment_manifest: false,
          v11_issuance_phase: true,
        },
        issuance_phase: "final",
      },
      dedicated: { application_binding_ref: null, evidence_commitment: null },
      sidecar: {
        application_binding_ref: "signed-bind",
        evidence_commitment: SAMPLE_COMMITMENT,
        evidence_commitment_manifest: null,
      },
    });
    expect(reasons).toContain("application_binding_persistence_mismatch");
    expect(reasons).toContain("evidence_commitment_persistence_mismatch");
  });

  it("column present with non-null dedicated: enforce even when phase is not final", () => {
    const reasons = collectDedicatedSidecarMismatches({
      persistence: {
        columns: {
          application_binding_ref: true,
          evidence_commitment: false,
          evidence_commitment_manifest: false,
          v11_issuance_phase: true,
        },
        issuance_phase: null,
      },
      dedicated: { application_binding_ref: "col-a" },
      sidecar: {
        application_binding_ref: "col-b",
        evidence_commitment: null,
        evidence_commitment_manifest: null,
      },
    });
    expect(reasons).toEqual(["application_binding_persistence_mismatch"]);
  });

  it("readV11DedicatedColumnPresence uses key presence, not value", () => {
    const presence = readV11DedicatedColumnPresence({
      application_binding_ref: null,
      evidence_commitment: undefined,
    });
    expect(presence.application_binding_ref).toBe(true);
    expect(presence.evidence_commitment).toBe(true);
    expect(presence.evidence_commitment_manifest).toBe(false);
  });

  it("v11PersistenceContextFromRow prefers dedicated phase when column exists", () => {
    const ctx = v11PersistenceContextFromRow(
      { v11_issuance_phase: "final" },
      "pending",
    );
    expect(ctx.issuance_phase).toBe("final");
  });
});
