// FILE: lib/partner/build584/browserAcceptanceArtifact.ts

export type BrowserStageId =
  | "partner_authentication"
  | "application_access"
  | "institutional_configuration"
  | "hosted_holder_authorization"
  | "independent_receipt_verification";

export type BrowserStageStatus = "pass" | "fail" | "blocked" | "skipped";

export type BrowserStageRecord = {
  status: BrowserStageStatus;
  detail: string;
};

export type BrowserApiObservation = {
  label: string;
  method: string;
  path: string;
  http_status: number;
  authenticated?: boolean;
  partner_id?: string;
  environment?: string;
  application_id?: string;
  application_access?: boolean;
  policy_template_id?: string;
  institutional_activation_present?: boolean;
};

export type Build584BrowserAcceptanceArtifact = {
  ok?: boolean;
  build?: number;
  build_identity?: string;
  environment?: string;
  recorded_at?: string;
  routes_tested?: string[];
  evidence_sources?: string[];
  api_observations?: BrowserApiObservation[];
  stages?: Partial<Record<BrowserStageId, BrowserStageRecord>>;
  walkthrough_complete?: boolean;
  partner_authentication_confirmed?: boolean;
  outcomes?: Array<{ step: string; status: string; detail: string }>;
};

export type BrowserArtifactValidation = {
  artifact_present: boolean;
  partner_authentication_complete: boolean;
  application_access_complete: boolean;
  institutional_configuration_complete: boolean;
  hosted_holder_authorization_complete: boolean;
  independent_receipt_verification_complete: boolean;
  walkthrough_complete: boolean;
  tier_status: "pass" | "fail" | "blocked";
  detail: string;
};

const REQUIRED_STAGE_KEYS: BrowserStageId[] = [
  "partner_authentication",
  "application_access",
  "institutional_configuration",
  "hosted_holder_authorization",
  "independent_receipt_verification",
];

export function validateBuild584BrowserArtifact(
  artifact: Build584BrowserAcceptanceArtifact | null,
): BrowserArtifactValidation {
  if (!artifact) {
    return {
      artifact_present: false,
      partner_authentication_complete: false,
      application_access_complete: false,
      institutional_configuration_complete: false,
      hosted_holder_authorization_complete: false,
      independent_receipt_verification_complete: false,
      walkthrough_complete: false,
      tier_status: "blocked",
      detail: "No browser artifact. Run npm run build-584:authenticated-browser-acceptance with BUILD584_PARTNER_API_KEY.",
    };
  }

  const stages = artifact.stages ?? {};
  const stageStatus = (id: BrowserStageId) => stages[id]?.status;
  const partnerAuth = stageStatus("partner_authentication") === "pass" && artifact.partner_authentication_confirmed === true;
  const appAccess = stageStatus("application_access") === "pass";
  const instConfig = stageStatus("institutional_configuration") === "pass";
  const holder = stageStatus("hosted_holder_authorization") === "pass";
  const independent = stageStatus("independent_receipt_verification") === "pass";
  const walkthrough = artifact.walkthrough_complete === true && REQUIRED_STAGE_KEYS.every((id) => stageStatus(id) === "pass");

  const hasEvidence =
    Array.isArray(artifact.routes_tested)
    && artifact.routes_tested.length > 0
    && Array.isArray(artifact.evidence_sources)
    && artifact.evidence_sources.length > 0
    && Array.isArray(artifact.api_observations)
    && artifact.api_observations.length > 0;

  if (!hasEvidence) {
    return {
      artifact_present: true,
      partner_authentication_complete: partnerAuth,
      application_access_complete: appAccess,
      institutional_configuration_complete: instConfig,
      hosted_holder_authorization_complete: holder,
      independent_receipt_verification_complete: independent,
      walkthrough_complete: false,
      tier_status: "blocked",
      detail: "Artifact missing routes_tested[], evidence_sources[], or api_observations[] from Playwright execution.",
    };
  }

  if (stageStatus("partner_authentication") === "fail") {
    return {
      artifact_present: true,
      partner_authentication_complete: false,
      application_access_complete: appAccess,
      institutional_configuration_complete: instConfig,
      hosted_holder_authorization_complete: holder,
      independent_receipt_verification_complete: independent,
      walkthrough_complete: false,
      tier_status: "fail",
      detail: "Partner authentication failed or could not be confirmed via GET /api/launchpad/auth/session.",
    };
  }

  if (walkthrough) {
    return {
      artifact_present: true,
      partner_authentication_complete: true,
      application_access_complete: true,
      institutional_configuration_complete: true,
      hosted_holder_authorization_complete: true,
      independent_receipt_verification_complete: true,
      walkthrough_complete: true,
      tier_status: "pass",
      detail: "Full authenticated institutional browser walkthrough recorded with API-confirmed stages.",
    };
  }

  if (partnerAuth) {
    return {
      artifact_present: true,
      partner_authentication_complete: true,
      application_access_complete: appAccess,
      institutional_configuration_complete: instConfig,
      hosted_holder_authorization_complete: holder,
      independent_receipt_verification_complete: independent,
      walkthrough_complete: false,
      tier_status: "blocked",
      detail:
        "Partner authentication confirmed via API; full institutional walkthrough not complete (holder authorization and/or live independent receipt verification still required).",
    };
  }

  return {
    artifact_present: true,
    partner_authentication_complete: false,
    application_access_complete: appAccess,
    institutional_configuration_complete: instConfig,
    hosted_holder_authorization_complete: holder,
    independent_receipt_verification_complete: independent,
    walkthrough_complete: false,
    tier_status: "blocked",
    detail: "Browser evidence present but partner session was not authoritatively confirmed.",
  };
}
