// FILE: lib/partner/launchpad/sandboxReadiness/index.ts
// Partner Sandbox and Integration Readiness Gate.

export {
  SANDBOX_READINESS_STAGES,
  SANDBOX_READINESS_CODES,
  SANDBOX_READINESS_LABEL,
  SANDBOX_PASS_IS_NOT_PRODUCTION_AUTHORIZATION,
  type SandboxReadinessStageId,
  type SandboxReadinessStatus,
  type SandboxReadinessCode,
} from "@/lib/partner/launchpad/sandboxReadiness/codes";

export {
  buildSandboxTestPlan,
  evaluateCallbackUrlAgainstAllowlist,
  verifiedCallbackHost,
  type SandboxTestPlan,
  type SandboxReadinessEvidence,
} from "@/lib/partner/launchpad/sandboxReadiness/plan";

export {
  buildSandboxManifest,
  validateSandboxManifest,
  sandboxManifestConformanceFixture,
  type SandboxManifest,
} from "@/lib/partner/launchpad/sandboxReadiness/manifest";

export {
  runSandboxReadinessStage,
  isSandboxReadinessStage,
  type SandboxStageRunResult,
} from "@/lib/partner/launchpad/sandboxReadiness/execute";

export {
  collectSandboxReadinessEvidence,
  buildSandboxReadinessReport,
  recordSandboxReadinessRun,
} from "@/lib/partner/launchpad/sandboxReadiness/loadReport";
