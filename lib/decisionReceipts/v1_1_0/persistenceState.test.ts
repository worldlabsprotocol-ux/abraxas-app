// FILE: lib/decisionReceipts/v1_1_0/persistenceState.test.ts

import { describe, expect, it } from "vitest";
import { EVIDENCE_COMMITMENT_SCHEMA } from "@/lib/decisionReceipts/schema/v1_1_0.constants";
import {
  assertAtomicFinalizationWritePayload,
  classifyStorageSchemaEpoch,
  classifyV11DedicatedPersistenceEpoch,
  isCompleteAuthoritativeV11DedicatedSet,
} from "@/lib/decisionReceipts/v1_1_0/persistenceState";

const COMMITMENT = { schema: EVIDENCE_COMMITMENT_SCHEMA, digest: "d", entry_count: 0 };

describe("Build #847 persistence state matrix", () => {
  it("pre-151: no issuance_finalized_at key", () => {
    expect(classifyStorageSchemaEpoch({ id: "1" })).toBe("pre_151_legacy");
  });

  it("post-151 pre-152: finalization column without v152 columns", () => {
    expect(classifyStorageSchemaEpoch({
      id: "1",
      issuance_finalized_at: "2026-01-01T00:00:00.000Z",
    })).toBe("post_151_pre_152");
  });

  it("post-152 capable storage", () => {
    expect(classifyStorageSchemaEpoch({
      id: "1",
      application_binding_ref: null,
    })).toBe("post_152_capable");
  });

  it("sidecar-only v1.1.0", () => {
    expect(classifyV11DedicatedPersistenceEpoch("1.1.0", { id: "1" })).toBe("sidecar_only_v11");
  });

  it("post-152 unbackfilled (keys present, all null)", () => {
    expect(classifyV11DedicatedPersistenceEpoch("1.1.0", {
      id: "1",
      application_binding_ref: null,
      evidence_commitment: null,
      evidence_commitment_manifest: null,
      v11_issuance_phase: null,
    })).toBe("post_152_unbackfilled");
  });

  it("partially backfilled", () => {
    expect(classifyV11DedicatedPersistenceEpoch("1.1.0", {
      id: "1",
      application_binding_ref: "bind",
      evidence_commitment: null,
      evidence_commitment_manifest: null,
      v11_issuance_phase: null,
    })).toBe("partially_backfilled");
  });

  it("fully finalized dedicated set", () => {
    const row = {
      id: "1",
      application_binding_ref: null,
      evidence_commitment: COMMITMENT,
      evidence_commitment_manifest: [],
      v11_issuance_phase: "final",
    };
    expect(isCompleteAuthoritativeV11DedicatedSet(row)).toBe(true);
    expect(classifyV11DedicatedPersistenceEpoch("1.1.0", row)).toBe("fully_finalized_dedicated");
  });

  it("atomic write payload rejects incomplete sets", () => {
    expect(() => assertAtomicFinalizationWritePayload({
      payload_hash: "h",
      signature: "s",
      anchor_reference: "a",
      application_binding_ref: null,
      evidence_commitment: COMMITMENT,
      evidence_commitment_manifest: [],
      issuance_finalized_at: "2026-01-01T00:00:00.000Z",
      v11_issuance_phase: "pending" as "final",
    })).toThrow(/phase/);
  });
});
