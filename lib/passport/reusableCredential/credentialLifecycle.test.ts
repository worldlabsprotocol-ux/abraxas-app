// FILE: lib/passport/reusableCredential/credentialLifecycle.test.ts

import { describe, expect, it } from "vitest";
import { resolveReusableCredentialLifecycle } from "./credentialLifecycle";

describe("reusable credential lifecycle", () => {
  it("requires possession key after authoritative approval", () => {
    const snap = resolveReusableCredentialLifecycle({
      storageEnabled: true,
      possessionKeyRegistered: false,
      verificationRows: [
        {
          status: "approved",
          identity_verification_status: "approved",
          credential_status: "active",
          credential_jti: "urn:uuid:1",
          credential_issued_at: "2026-06-01T12:00:00.000Z",
          document_verified: true,
          liveness_passed: true,
          updated_at: "2026-06-01T12:00:00.000Z",
        },
      ],
      activeIssuerBackedCredentialCount: 0,
      expiredIssuerBackedCredentialCount: 0,
    });
    expect(snap.state).toBe("possession_key_required");
    expect(snap.recovery?.kind).toBe("register_possession_key");
  });

  it("shows issued only when persisted credentials exist", () => {
    const snap = resolveReusableCredentialLifecycle({
      storageEnabled: true,
      possessionKeyRegistered: true,
      verificationRows: [],
      activeIssuerBackedCredentialCount: 1,
      expiredIssuerBackedCredentialCount: 0,
    });
    expect(snap.state).toBe("credential_issued");
  });

  it("does not show issued when storage disabled", () => {
    const snap = resolveReusableCredentialLifecycle({
      storageEnabled: false,
      possessionKeyRegistered: true,
      verificationRows: [],
      activeIssuerBackedCredentialCount: 0,
      expiredIssuerBackedCredentialCount: 0,
    });
    expect(snap.state).toBe("issuance_unavailable");
  });
});
