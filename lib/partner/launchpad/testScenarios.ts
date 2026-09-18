// FILE: lib/partner/launchpad/testScenarios.ts
// Launchpad test console scenarios — backed by the partner test harness.

export {
  PARTNER_HARNESS_SCENARIOS as LAUNCHPAD_TEST_SCENARIOS,
  resolvePartnerHarnessScenario as resolveLaunchpadTestScenario,
  type PartnerHarnessScenario as LaunchpadTestScenario,
  type PartnerHarnessScenarioId as LaunchpadTestScenarioId,
} from "@/lib/partner/launchpad/partnerTestHarness";
