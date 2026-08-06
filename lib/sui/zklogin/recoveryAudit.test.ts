import { describe, expect, it } from "vitest";
import {
  auditMetadataHasNoPii,
  buildZkLoginRecoveryAuditMetadata,
} from "./recoveryAudit";

describe("recoveryAudit", () => {
  it("builds audit metadata without PII or secrets", () => {
    const meta = buildZkLoginRecoveryAuditMetadata({
      loginMode: "legacy_recovery",
      audienceCohort: "legacy",
      outcome: "success",
    });
    expect(meta).toEqual({
      event: "zklogin_identity_recovery",
      login_mode: "legacy_recovery",
      audience_cohort: "legacy",
      outcome: "success",
    });
    expect(auditMetadataHasNoPii(meta)).toBe(true);
    expect(JSON.stringify(meta)).not.toMatch(/@|0x[a-f0-9]{8,}/i);
  });

  it("flags metadata that would leak PII keys", () => {
    expect(auditMetadataHasNoPii({ email: "hidden@example.com" })).toBe(false);
    expect(auditMetadataHasNoPii({ oauth_sub: "123" })).toBe(false);
    expect(auditMetadataHasNoPii({ user_salt: "982451653" })).toBe(false);
  });
});
