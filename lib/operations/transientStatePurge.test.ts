// FILE: lib/operations/transientStatePurge.test.ts

import { describe, expect, it } from "vitest";
import { purgeExpiredTransientState } from "./transientStatePurge";

describe("transient state purge", () => {
  it("dry-run returns zero counts without deleting", async () => {
    const result = await purgeExpiredTransientState({ dryRun: true });
    expect(result).toEqual({
      provenance_flow_sessions: 0,
      provenance_content_submissions: 0,
      organization_eligibility_consents: 0,
      sandbox_readiness_runs: 0,
      zklogin_oauth_jti_consumed: 0,
    });
  });
});
