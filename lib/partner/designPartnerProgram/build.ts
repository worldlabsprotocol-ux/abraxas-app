// FILE: lib/partner/designPartnerProgram/build.ts
// Assemble design partner application and portfolio views.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { buildApplicationValueEvidence, type ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";
import { loadCommercialState, loadIcpProfile, listFeatureRequests } from "@/lib/partner/valueEvidence/store";
import {
  loadProgram,
  listPrograms,
  listCriteria,
  loadCaseStudyPermissions,
  listCustomerReportedEvidence,
} from "./store";
import { buildDesignPartnerPilotScorecard } from "./scorecard";
import { buildDesignPartnerFunnel } from "./funnel";
import { computeTimeToConversion } from "./velocity";
import { buildLostPilotIntelligence } from "./lostPilot";
import { buildICPEvidence } from "./icpEvidence";
import { buildCommercialModelLearning } from "./commercialModel";
import { buildCaseStudyArtifact } from "./caseStudyArtifact";
import { buildDesignPartnerPortfolioEvidence } from "./portfolioExport";
import { buildFundraisingSlideReadiness } from "./fundraisingSlides";
import { derivePartnerNextAction } from "./nextAction";
import { resolveEffectiveProgramStatus } from "./programLifecycle";
import { DESIGN_PARTNER_NOTICE, DESIGN_PARTNER_PROGRAM_VERSION } from "./contract";

export interface DesignPartnerApplicationView {
  contract_version: typeof DESIGN_PARTNER_PROGRAM_VERSION;
  notice: typeof DESIGN_PARTNER_NOTICE;
  program: Awaited<ReturnType<typeof loadProgram>>;
  value_evidence: ApplicationValueEvidence;
  scorecard: ReturnType<typeof buildDesignPartnerPilotScorecard>;
  time_to_conversion: ReturnType<typeof computeTimeToConversion> | null;
  case_study_artifact: ReturnType<typeof buildCaseStudyArtifact> | null;
  case_study_permissions: Awaited<ReturnType<typeof loadCaseStudyPermissions>>;
  customer_reported_evidence: Awaited<ReturnType<typeof listCustomerReportedEvidence>>;
  partner_next_action: string | null;
}

export interface DesignPartnerPortfolioView {
  contract_version: typeof DESIGN_PARTNER_PROGRAM_VERSION;
  notice: typeof DESIGN_PARTNER_NOTICE;
  generated_at: string;
  applications: DesignPartnerApplicationView[];
  funnel: ReturnType<typeof buildDesignPartnerFunnel>;
  lost_pilot_intelligence: ReturnType<typeof buildLostPilotIntelligence>;
  icp_evidence: ReturnType<typeof buildICPEvidence>;
  commercial_model_learning: ReturnType<typeof buildCommercialModelLearning>;
  portfolio_evidence: ReturnType<typeof buildDesignPartnerPortfolioEvidence>;
  fundraising_slide_readiness: ReturnType<typeof buildFundraisingSlideReadiness>;
  active_pilots: number;
  empty_state: boolean;
}

export async function buildDesignPartnerApplicationView(input: {
  application: LaunchpadApplicationRow;
  from?: Date | null;
  to?: Date | null;
}): Promise<DesignPartnerApplicationView> {
  const valueEvidence = await buildApplicationValueEvidence(input);
  const program = await loadProgram(input.application.id);
  const criteria = program ? await listCriteria(input.application.id) : [];
  const scorecard = buildDesignPartnerPilotScorecard({ program, criteria, valueEvidence });
  const permissions = program ? await loadCaseStudyPermissions(input.application.id) : null;
  const customerReported = program ? await listCustomerReportedEvidence(input.application.id) : [];

  const effective = program && scorecard
    ? scorecard.effective_program_status
    : null;

  return {
    contract_version: DESIGN_PARTNER_PROGRAM_VERSION,
    notice: DESIGN_PARTNER_NOTICE,
    program,
    value_evidence: valueEvidence,
    scorecard,
    time_to_conversion: program ? computeTimeToConversion({ program, valueEvidence }) : null,
    case_study_artifact: program && scorecard
      ? buildCaseStudyArtifact({ program, valueEvidence, scorecard, permissions, customerReported })
      : null,
    case_study_permissions: permissions,
    customer_reported_evidence: customerReported,
    partner_next_action: program && scorecard
      ? derivePartnerNextAction({
        effectiveStatus: effective ?? program.program_status,
        pilotSandbox: valueEvidence.pilot_sandbox,
        criteria: scorecard.criteria,
      })
      : null,
  };
}

export async function buildDesignPartnerPortfolioView(input: {
  applications: LaunchpadApplicationRow[];
  from?: Date | null;
  to?: Date | null;
}): Promise<DesignPartnerPortfolioView> {
  const views: DesignPartnerApplicationView[] = [];
  for (const application of input.applications) {
    views.push(await buildDesignPartnerApplicationView({ application, from: input.from, to: input.to }));
  }

  const programs = (await Promise.all(input.applications.map((a) => loadProgram(a.id)))).filter((p): p is NonNullable<typeof p> => p != null);
  const scorecards = views.map((v) => v.scorecard);
  const valueEvidenceList = views.map((v) => v.value_evidence);

  const icpMap = new Map<string, Awaited<ReturnType<typeof loadIcpProfile>>>();
  const commercialMap = new Map<string, Awaited<ReturnType<typeof loadCommercialState>>>();
  const evidenceMap = new Map<string, ApplicationValueEvidence>();
  for (const view of views) {
    icpMap.set(view.value_evidence.application_id, view.value_evidence.icp_profile);
    commercialMap.set(view.value_evidence.application_id, view.value_evidence.commercial_state);
    evidenceMap.set(view.value_evidence.application_id, view.value_evidence);
  }

  const allFeatureRequests = [];
  for (const app of input.applications) {
    allFeatureRequests.push(...await listFeatureRequests(app.partner_id));
  }

  const funnel = buildDesignPartnerFunnel({ programs, scorecards, valueEvidence: valueEvidenceList });
  const lostPilot = buildLostPilotIntelligence({ programs, featureRequests: allFeatureRequests });
  const icpEvidence = buildICPEvidence({ programs, icpProfiles: icpMap, valueEvidence: evidenceMap });
  const commercialModel = buildCommercialModelLearning({ programs, commercialStates: commercialMap, valueEvidence: evidenceMap });

  const timeToConversion = programs.map((p) => {
    const ev = evidenceMap.get(p.application_id);
    return ev ? computeTimeToConversion({ program: p, valueEvidence: ev }) : {};
  });

  const publishability = views.map((v) => v.case_study_artifact?.publishability.status ?? "blocked");
  const permissions = views.map((v) => v.case_study_permissions).filter((p): p is NonNullable<typeof p> => p != null);

  const portfolioEvidence = buildDesignPartnerPortfolioEvidence({
    funnelCounts: funnel.counts,
    scorecards,
    valueEvidence: valueEvidenceList,
    timeToConversion,
    caseStudyPublishability: publishability,
  });

  const slideReadiness = buildFundraisingSlideReadiness({
    funnel: funnel.counts,
    permissions,
    valueEvidence: valueEvidenceList,
    portfolioEvidence,
  });

  const activePilots = programs.filter((p) => p.pilot_started_at && !p.pilot_completed_at).length;

  return {
    contract_version: DESIGN_PARTNER_PROGRAM_VERSION,
    notice: DESIGN_PARTNER_NOTICE,
    generated_at: new Date().toISOString(),
    applications: views,
    funnel,
    lost_pilot_intelligence: lostPilot,
    icp_evidence: icpEvidence,
    commercial_model_learning: commercialModel,
    portfolio_evidence: portfolioEvidence,
    fundraising_slide_readiness: slideReadiness,
    active_pilots: activePilots,
    empty_state: programs.length === 0,
  };
}

export async function buildDesignPartnerPortfolioFromDb(partnerId?: string): Promise<DesignPartnerPortfolioView> {
  const programs = await listPrograms(partnerId);
  const applicationIds = programs.map((p) => p.application_id);
  if (applicationIds.length === 0) {
    return buildDesignPartnerPortfolioView({ applications: [] });
  }
  // Caller should pass applications from Launchpad — placeholder for API layer
  return buildDesignPartnerPortfolioView({ applications: [] });
}

export { resolveEffectiveProgramStatus };
