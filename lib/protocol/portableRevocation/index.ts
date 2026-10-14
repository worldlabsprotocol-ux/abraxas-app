// FILE: lib/protocol/portableRevocation/index.ts

export {
  PORTABLE_REVOCATION_BUILD,
  PORTABLE_REVOCATION_MEDIA_TYPE,
  PORTABLE_REVOCATION_SCHEMA_VERSION,
  type PortableRevocationSignedArtifact,
  type PortableRevocationPayload,
  type PortableRevocationBootstrapTrust,
  type PortableRevocationCheckpoint,
} from "./contract";
export {
  type PortableRevocationIssuerTrustPolicy,
  resolveAuthorizedRevocationIssuerForReceipt,
  bootstrapTrustFromArtifact,
} from "./issuerAuthority";
export {
  type PortableRevocationCheckpointStore,
  InMemoryPortableRevocationCheckpointStore,
} from "./checkpointStore";
export {
  PORTABLE_REVOCATION_DEFAULT_CLOCK_SKEW_SECONDS,
  validatePortableRevocationFreshness,
} from "./freshness";
export {
  verifyPortableRevocationAtRelyingParty,
  type VerifyPortableRevocationAtRelyingPartyResult,
} from "./rpVerify";
export { portableRevocationStatusId } from "./statusId";
export { hashPortableRevocationPayload } from "./canonical";
export {
  buildPortableRevocationPayload,
  signPortableRevocationSnapshot,
  verifyPortableRevocationSignature,
} from "./sign";
export {
  verifyPortableRevocationArtifact,
  revocationSourceFromPortableSnapshot,
  type PortableRevocationVerification,
} from "./verify";
export {
  buildSyntheticPortableRevocationSnapshot,
  build546PortableRevocationIssuerTrust,
  PORTABLE_REVOCATION_TEST_ISSUER_ID,
} from "./fixtures";
