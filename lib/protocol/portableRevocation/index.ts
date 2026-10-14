// FILE: lib/protocol/portableRevocation/index.ts

export {
  PORTABLE_REVOCATION_BUILD,
  PORTABLE_REVOCATION_MEDIA_TYPE,
  PORTABLE_REVOCATION_SCHEMA_VERSION,
  type PortableRevocationSignedArtifact,
  type PortableRevocationPayload,
} from "./contract";
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
export { buildSyntheticPortableRevocationSnapshot, PORTABLE_REVOCATION_TEST_ISSUER_ID } from "./fixtures";
