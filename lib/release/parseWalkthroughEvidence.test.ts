import { describe, expect, it } from "vitest";
import { assessWalkthroughEvidence } from "@/lib/release/parseWalkthroughEvidence";

const PLACEHOLDER_SCENARIO_A = `
### Scenario A — New user → regulated purchase

| Field | Value |
|-------|-------|
| **Pass?** | _Pass / Fail_ |
| **Decision ID** | _decision_id UUID_ |
| **Receipt ID** | _dr_*_ |
| **Flow trace ID** | _ft_vr_{verification_request_id}_ |
| **Evidence** | _Screenshot + network HAR_ |
`;

const COMPLETE_SCENARIO_A = `
### Scenario A — New user → regulated purchase

| Field | Value |
|-------|-------|
| **Pass?** | Pass |
| **Decision ID** | aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee |
| **Receipt ID** | dr_live_example_001 |
| **Flow trace ID** | ft_vr_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee |
| **Evidence** | Callback URL captured; GET /api/receipts/dr_live_example_001/public → signature_valid: true |

Automated IAT companion (read-only pre-check)
npm run iat:automated
| **Full IAT claimed** | **No** |
`;

describe("assessWalkthroughEvidence", () => {
  it("does not claim Scenario A complete when placeholders remain", () => {
    const result = assessWalkthroughEvidence(PLACEHOLDER_SCENARIO_A);
    expect(result.scenarioAComplete).toBe(false);
    expect(result.fullIatComplete).toBe(false);
    expect(result.missingForScenarioA.length).toBeGreaterThan(0);
  });

  it("claims Scenario A complete only with decision_id, receipt_id, signature, callback, and flow_trace_id", () => {
    const result = assessWalkthroughEvidence(COMPLETE_SCENARIO_A);
    expect(result.scenarioAComplete).toBe(true);
    expect(result.scenarios[0]?.decisionId).toBe("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(result.scenarios[0]?.receiptId).toBe("dr_live_example_001");
    expect(result.scenarios[0]?.signatureValidProof).toBe(true);
    expect(result.scenarios[0]?.callbackProof).toBe(true);
  });

  it("detects automated companion entry without claiming full IAT", () => {
    const result = assessWalkthroughEvidence(COMPLETE_SCENARIO_A);
    expect(result.automatedCompanionRecorded).toBe(true);
    expect(result.fullIatComplete).toBe(false);
  });
});
