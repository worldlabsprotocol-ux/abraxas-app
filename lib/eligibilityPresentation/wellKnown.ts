// FILE: lib/eligibilityPresentation/wellKnown.ts

import {
  ELIGIBILITY_PRESENTATION_DOCS,
  ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
  ELIGIBILITY_PRESENTATION_NOTICE,
  ELIGIBILITY_PRESENTATION_RECEIPT_VERIFY,
  ELIGIBILITY_PRESENTATION_SCHEMA_PATH,
  ELIGIBILITY_PRESENTATION_SIGNING_KEYS,
  ELIGIBILITY_PRESENTATION_UTILA_NOTICE,
  ELIGIBILITY_PRESENTATION_VERSION,
  ELIGIBILITY_PRESENTATION_WELL_KNOWN,
} from "./contract";
import { eligibilityPlanningPublicChoices } from "./planning";

export function eligibilityWellKnownDocument() {
  return {
    protocol: "abraxas-eligibility-presentation",
    version: ELIGIBILITY_PRESENTATION_VERSION,
    media_type: ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
    envelope_versions: [ELIGIBILITY_PRESENTATION_VERSION],
    schema: ELIGIBILITY_PRESENTATION_SCHEMA_PATH,
    signing_keys: ELIGIBILITY_PRESENTATION_SIGNING_KEYS,
    receipt_verification: ELIGIBILITY_PRESENTATION_RECEIPT_VERIFY,
    well_known: ELIGIBILITY_PRESENTATION_WELL_KNOWN,
    docs: ELIGIBILITY_PRESENTATION_DOCS,
    notice: ELIGIBILITY_PRESENTATION_NOTICE,
    utila_notice: ELIGIBILITY_PRESENTATION_UTILA_NOTICE,
    presentation_sufficient_alone: false,
    bearer_credential: false,
    automatic_kyc_kyb_approval: false,
    transferable_passport: false,
    browser_authoritative: false,
    parallel_signing_trust: false,
    planning: eligibilityPlanningPublicChoices(),
  };
}
