// FILE: lib/institutionalVerification/index.ts
// Build #586 — institutional trust verification SDK (wraps existing cryptographic verifiers).

export {
  INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
  INSTITUTIONAL_VERIFICATION_CONTRACT_ID,
  type InstitutionalVerificationCapability,
  type InstitutionalTrustEnvironment,
  type InstitutionalVerificationIntent,
  type RelyingPartyScope,
  type InstitutionalVerifierRejectionReason,
  type InstitutionalVerificationVerdict,
  type InstitutionalReceiptVerificationResult,
  type InstitutionalPresentationVerificationResult,
  type VerifySignedDecisionReceiptInput,
  type VerifyHolderPresentationInput,
  type CrossApplicationVerificationInput,
  type CrossApplicationVerificationResult,
} from "./contract";

export {
  RECEIPT_TRUST_DIGEST_VERSION,
  digestReceiptVerificationKeyDocument,
  digestReceiptVerificationTrustKeys,
  fetchVerifiedReceiptKeyDocument,
  resolveInstitutionalTrustEnv,
  validateFetchedReceiptKeyDocument,
  validateInstitutionReceiptVerificationRegistryJson,
  type InstitutionalTrustEnvInput,
  type InstitutionalTrustEnvResult,
  type TrustMaterialFetchResult,
  type InstitutionRegistryValidationResult,
} from "./trustMaterial";

export {
  buildInstitutionalVerificationContractDocument,
  type InstitutionalVerificationContractDocument,
} from "./verificationContractDocument";

export {
  verifySignedDecisionReceipt,
  inspectSignedDecisionReceipt,
} from "./verifyDecisionReceipt";
export {
  verifyHolderTrustPresentation,
  inspectHolderTrustPresentation,
} from "./verifyPresentation";
export { verifyCrossApplicationPresentation } from "./crossApplication";

export {
  mapPresentationFailure,
  mapReceiptFailureCodes,
  presentationVerdictFromOutcome,
  receiptVerdictFromUnderlying,
} from "./reasonMapping";

export {
  INSTITUTIONAL_REPLAY_SEMANTICS,
  requireConsumptionStoreForAuthorization,
  isDurableConsumptionStore,
} from "./replayPolicy";

export {
  inspectSignedDecisionReceiptCryptography,
  inspectHolderPresentationCryptography,
} from "./inspectOnly";
