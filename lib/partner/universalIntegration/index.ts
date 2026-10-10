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
