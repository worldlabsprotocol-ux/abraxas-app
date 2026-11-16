// FILE: lib/privacy/auditorDisclosure/index.ts

export {
  AUDITOR_DISCLOSURE_MANDATE_DOCUMENT,
  AUDITOR_DISCLOSURE_MANDATE_SCHEMA_VERSION,
  INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS,
  AUDITOR_DISCLOSURE_PURPOSES,
  AUDITOR_REVIEW_FORBIDDEN_FIELDS,
  AUDITOR_DISCLOSURE_PROFILE_NOTICE,
  CONTROLLED_AUDITOR_MANDATE_ISSUER_FIXTURE_LABEL,
  type AuditorDisclosurePurpose,
  type AuditorDisclosureMandatePayload,
  type SignedAuditorDisclosureMandate,
} from "./contract";
export { hashAuditorDisclosureMandatePayload } from "./canonical";
export { signAuditorDisclosureMandatePayload, verifySignedAuditorDisclosureMandate } from "./signVerify";
export { evaluateAuditorDisclosureAccess } from "./enforceAccess";
export {
  resolveInstitutionalAuditorPrincipal,
  parseAuditorAccessRegistry,
  type AuditorAccessRegistryEntry,
} from "./auditorPrincipal";
export {
  parseRequestedDisclosurePurpose,
  authorizeRequestedDisclosurePurpose,
} from "./requestPurpose";
export {
  isIndividualAuditorCredentialSessionKey,
  assertIndividualAuditorCredentialSessionKey,
  INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
} from "./contract";
export { resolveAuthoritativeAuditorDisclosureTrust, isAuditorMandateRevokedInRegistry } from "./serverTrust";
export { loadAuthoritativeReceiptForAuditorDisclosure } from "./authoritativeResource";
export { resolveInstitutionalTenantId } from "./institutionalTenant";
export { buildAuditorDisclosureSource } from "./buildSource";
export { auditAuditorDisclosurePayload } from "./auditPrivacy";
export {
  buildControlledAuditorMandateIssuerFixture,
  buildControlledSignedAuditorMandate,
  controlledAuditorReceiptRecord,
  CONTROLLED_AUDITOR_ID,
  CONTROLLED_RECEIPT_ID,
  CONTROLLED_TENANT_ID,
} from "./controlledFixture";