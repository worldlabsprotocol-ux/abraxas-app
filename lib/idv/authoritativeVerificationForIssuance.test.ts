// FILE: lib/idv/authoritativeVerificationForIssuance.test.ts

import { describe, expect, it } from "vitest";
import {
  isAuthoritativeFinalApproval,
  selectAuthoritativeVerificationForIssuance,
} from "./authoritativeVerificationForIssuance";

const FINAL = {
  status: "approved",
  identity_verification_status: "approved",
  credential_status: "active",
  credential_jti: "urn:uuid:final-1",
  credential_issued_at: "2026-06-01T12:00:00.000Z",
  document_verified: true,
  liveness_passed: true,
  updated_at: "2026-06-01T12:00:00.000Z",
};

describe("authoritative verification for reusable credential issuance", () => {
  it("requires all approval signals, not credential_status alone", () => {
    expect(
      isAuthoritativeFinalApproval({
        ...FINAL,
        identity_verification_status: "submitted",
      }),
    ).toBe(false);
    expect(
      selectAuthoritativeVerificationForIssuance([
        { credential_status: "active", credential_jti: "urn:uuid:x", status: "pending" },
      ]).ok,
    ).toBe(false);
  });

  it("rejects active credential without approved verification", () => {
    const result = selectAuthoritativeVerificationForIssuance([
      {
        status: "approved",
        identity_verification_status: "submitted",
        credential_status: "active",
        credential_jti: "urn:uuid:bad",
        credential_issued_at: "2026-06-01T12:00:00.000Z",
        document_verified: true,
        liveness_passed: true,
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("verification_contradictory");
  });

  it("selects newest finalized record deterministically", () => {
    const result = selectAuthoritativeVerificationForIssuance([
      {
        status: "submitted",
        identity_verification_status: "submitted",
        credential_status: "not_issued",
      },
      { ...FINAL, credential_jti: "urn:uuid:newer", credential_issued_at: "2026-08-01T00:00:00.000Z" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credentialJti).toBe("urn:uuid:newer");
  });

  it("rejects ambiguous multiple finalized credentials", () => {
    const result = selectAuthoritativeVerificationForIssuance([
      { ...FINAL, credential_jti: "urn:uuid:a", credential_issued_at: "2026-08-01T00:00:00.000Z" },
      { ...FINAL, credential_jti: "urn:uuid:b", credential_issued_at: "2026-08-02T00:00:00.000Z" },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("verification_ambiguous");
  });

  it("rejects outdated approval with contradictory legacy status", () => {
    const result = selectAuthoritativeVerificationForIssuance([
      {
        ...FINAL,
        status: "revoked",
      },
    ]);
    expect(result.ok).toBe(false);
  });
});
