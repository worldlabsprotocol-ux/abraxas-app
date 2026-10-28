// FILE: lib/partner/launchpad/testScenarioClientRequest.ts

export const LAUNCHPAD_TEST_SCENARIO_BODY_KEYS = ["scenario_id", "return_url"] as const;

export function buildLaunchpadTestScenarioRequestBody(input: {
  scenarioId: string;
  returnUrl: string;
}): { scenario_id: string; return_url: string } {
  return {
    scenario_id: input.scenarioId,
    return_url: input.returnUrl,
  };
}
