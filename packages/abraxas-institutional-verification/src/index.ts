/**
 * @abraxas/institutional-verification — public SDK surface (Build #587).
 * Bundles repository verification logic; no runtime @/ imports in published artifacts.
 */

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
} from "@/lib/institutionalVerification/contract";

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
} from "@/lib/institutionalVerification/trustMaterial";

export {
  buildInstitutionalVerificationContractDocument,
  type InstitutionalVerificationContractDocument,
} from "@/lib/institutionalVerification/verificationContractDocument";

export {
  verifySignedDecisionReceipt,
  inspectSignedDecisionReceipt,
  verifyHolderTrustPresentation,
  inspectHolderTrustPresentation,
  verifyCrossApplicationPresentation,
} from "@/lib/institutionalVerification";

export {
  mapPresentationFailure,
  mapReceiptFailureCodes,
  presentationVerdictFromOutcome,
  receiptVerdictFromUnderlying,
} from "@/lib/institutionalVerification/reasonMapping";

export {
  INSTITUTIONAL_REPLAY_SEMANTICS,
  requireConsumptionStoreForAuthorization,
  isDurableConsumptionStore,
} from "@/lib/institutionalVerification/replayPolicy";

export type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";

export {
  PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
  PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
} from "@/lib/passport/reusableCredential/independentInstitutionConfig";

export type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
