// FILE: lib/partner/universalIntegration/integrationAdoptionSecurityAudit.test.ts

import { describe, expect, it } from "vitest";
import { auditIntegrationAdoptionSecurityControls } from "./integrationAdoptionSecurityAudit";

describe("integrationAdoptionSecurityAudit", () => {
  it("includes Build 870 freshness enforcement as tested", () => {
    const controls = auditIntegrationAdoptionSecurityControls();
    const freshness = controls.find((c) => c.id === "freshness_mandatory_deny");
    expect(freshness?.status).toBe("tested_in_ci");
  });
});
