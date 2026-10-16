// FILE: lib/institutionalVerification/index.ts
// Build #586 — institutional trust verification SDK (wraps existing cryptographic verifiers).

export {
  INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
  INSTITUTIONAL_VERIFICATION_CONTRACT_ID,
  type InstitutionalVerificationCapability,
  type InstitutionalTrustEnvironment,
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
  digestReceiptVerificationKeyDocument,
  fetchVerifiedReceiptKeyDocument,
  resolveInstitutionalTrustEnv,
  validateFetchedReceiptKeyDocument,
  type InstitutionalTrustEnvInput,
  type InstitutionalTrustEnvResult,
  type TrustMaterialFetchResult,
} from "./trustMaterial";

export {
  buildInstitutionalVerificationContractDocument,
  type InstitutionalVerificationContractDocument,
} from "./verificationContractDocument";

export { verifySignedDecisionReceipt } from "./verifyDecisionReceipt";
export { verifyHolderTrustPresentation } from "./verifyPresentation";
export { verifyCrossApplicationPresentation } from "./crossApplication";

export {
  mapPresentationFailure,
  mapReceiptFailureCodes,
  presentationVerdictFromOutcome,
  receiptVerdictFromUnderlying,
} from "./reasonMapping";
