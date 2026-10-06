export {
  DESIGN_PARTNER_PROGRAM_VERSION,
  DESIGN_PARTNER_NOTICE,
  PROGRAM_STATUSES,
  CRITERION_TYPES,
  DECISION_REASON_CODES,
  type ProgramStatus,
  type CriterionType,
  type EvaluatedCriterion,
  type PilotScorecard,
  type DesignPartnerProgramRow,
  type TechnicalOutcome,
  type DecisionOutcome,
  type EvidenceProvenance,
} from "./contract";
export {
  enrollProgram,
  updateProgram,
  createCriteria,
  recordDecision,
  upsertCaseStudyPermissions,
  addCustomerReportedEvidence,
  loadProgram,
  listPrograms,
  listCriteria,
  loadCaseStudyPermissions,
  listCustomerReportedEvidence,
  resetDesignPartnerStoreForTests,
  seedProgramForTests,
  seedCriteriaForTests,
  type CriteriaRow,
  type CaseStudyPermissionsRow,
  type CustomerReportedEvidenceRow,
} from "./store";
export { evaluateCriterion, evaluateAllCriteria, deriveTechnicalOutcome } from "./criteria";
export { buildDesignPartnerPilotScorecard } from "./scorecard";
export { resolveEffectiveProgramStatus } from "./programLifecycle";
export { deriveNextAction, derivePartnerNextAction } from "./nextAction";
export { buildDesignPartnerFunnel } from "./funnel";
export { computeTimeToConversion } from "./velocity";
export { buildLostPilotIntelligence } from "./lostPilot";
export { buildCohortAnalysis, type CohortDimension } from "./cohorts";
export { buildICPEvidence } from "./icpEvidence";
export { buildCommercialModelLearning } from "./commercialModel";
export { buildCaseStudyArtifact } from "./caseStudyArtifact";
export { buildDesignPartnerPortfolioEvidence } from "./portfolioExport";
export { buildFundraisingSlideReadiness } from "./fundraisingSlides";
export {
  buildDesignPartnerApplicationView,
  buildDesignPartnerPortfolioView,
  type DesignPartnerApplicationView,
  type DesignPartnerPortfolioView,
} from "./build";
export { designPartnerLeaks } from "./privacy";
export { buildPartnerPilotProgress, type PartnerPilotProgress } from "./partnerProgress";
