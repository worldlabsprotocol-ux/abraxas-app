// FILE: lib/partner/universalIntegration/index.ts

export {
  UNIVERSAL_READINESS_PHASES,
  deriveUniversalIntegrationReadiness,
  type UniversalReadinessPhase,
  type UniversalReadinessInput,
  type UniversalReadinessDiagnostic,
} from "./readinessDiagnostic";

export {
  EXAMPLE_MERCHANT_INTEGRATION,
  CONFORMANCE_PARTNER_INTEGRATION,
  runIndependentPartnerContractProof,
  type IndependentPartnerProofResult,
  type IndependentPartnerProofStep,
} from "./independentPartnerScenario";

export {
  LIVE_SANDBOX_ENV_KEYS,
  runLiveSandboxExecution,
  type LiveSandboxExecutionReport,
  type LiveSandboxStage,
} from "./liveSandboxExecution";

export { READINESS_EVIDENCE_MATRIX, type ReadinessEvidenceTier } from "./readinessEvidenceMatrix";

export { auditCommercialMeteringCapabilities } from "./commercialMeteringAudit";

export {
  READINESS_EVIDENCE_SOURCE,
  READINESS_PHASE_LABELS,
  describeReadinessPhase,
  readinessNextActions,
  readinessLiveExecutionHint,
} from "./readinessUi";

export {
  STAGING_LIVE_E2E_ENV_KEYS,
  runStagingLiveE2ePreflight,
  type StagingLiveE2eConfig,
  type StagingPreflightDiagnostic,
} from "./stagingConfigContract";

export {
  LIVE_E2E_ARTIFACT_SCHEMA_VERSION,
  resolveLiveReceiptCorrelation,
  type ExampleMerchantLiveE2eArtifact,
} from "./liveReceiptCorrelation";

export { deriveLiveExecutionSignals, type LiveExecutionSignals } from "./liveExecutionSignals";

export {
  runExampleMerchantLiveE2e,
  type LiveE2eRunnerReport,
} from "./exampleMerchantLiveE2eRunner";
