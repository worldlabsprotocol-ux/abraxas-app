// FILE: lib/passport/portableTrust/index.ts

export {
  PASSPORT_PORTABLE_TRUST_BUILD,
  HOLDER_PORTABLE_EXPORT_MEDIA_TYPE,
  HOLDER_PORTABLE_EXPORT_SCHEMA_VERSION,
  type HolderPortableCredentialSummary,
  type HolderPortablePresentationExport,
} from "./contract";
export {
  listHolderPortableCredentials,
  getHolderReceiptIfOwned,
} from "./holderReceiptAccess";
export {
  buildHolderPortableExport,
  composeHolderPresentationForPartner,
  parseHolderPortableImport,
  summarizeHolderPortableCredential,
} from "./presentationBundle";
export { verifyHolderPresentationIndependently } from "./independentVerification";
export {
  LINKABLE_RECEIPT_FIELDS,
  PORTABILITY_LIMITATIONS,
  SELECTIVE_DISCLOSURE_HONESTY,
} from "./privacyDisclosure";
