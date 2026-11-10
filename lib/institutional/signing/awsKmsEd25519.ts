// AWS KMS Sign for ECC_NIST_EDWARDS25519.
// ED25519_SHA_512 + MessageType RAW is standard Ed25519 over the supplied bytes.
// ED25519_PH_SHA_512 prehashes with SHA-512 and will not verify in Abraxas.
// Rates recorded from https://aws.amazon.com/kms/pricing/ (commercial regions):
// $1 per customer-managed key per month, $0.15 per 10,000 asymmetric requests.
// Asymmetric Sign is outside the 20,000-request free tier.

export const AWS_KMS_ED25519 = {
  keySpec: "ECC_NIST_EDWARDS25519",
  signingAlgorithm: "ED25519_SHA_512",
  messageType: "RAW",
  digestBytes: 32,
  signatureBytes: 64,
} as const;

export const AWS_KMS_ED25519_INCOMPATIBLE = {
  signingAlgorithm: "ED25519_PH_SHA_512",
  messageType: "DIGEST",
} as const;

export const AWS_KMS_PUBLISHED_COST = {
  usdPerCustomerManagedKeyMonth: 1,
  usdPer10000AsymmetricRequests: 0.15,
  asymmetricSignExcludedFromFreeTier: true,
  source: "https://aws.amazon.com/kms/pricing/",
} as const;

export type AwsKmsRawDigestSignInput = {
  keyId: string;
  message: Uint8Array;
  signingAlgorithm: typeof AWS_KMS_ED25519.signingAlgorithm;
  messageType: typeof AWS_KMS_ED25519.messageType;
};

export type RawEd25519SignClient = {
  sign(input: AwsKmsRawDigestSignInput): Promise<Uint8Array>;
};

export function awsKmsRawDigestSignInput(input: { keyId: string; digest: Uint8Array }):
  | { ok: true; request: AwsKmsRawDigestSignInput }
  | { ok: false; reason: "digest_must_be_32_bytes" } {
  if (input.digest.byteLength !== AWS_KMS_ED25519.digestBytes) {
    return { ok: false, reason: "digest_must_be_32_bytes" };
  }
  return {
    ok: true,
    request: {
      keyId: input.keyId,
      message: Uint8Array.from(input.digest),
      signingAlgorithm: AWS_KMS_ED25519.signingAlgorithm,
      messageType: AWS_KMS_ED25519.messageType,
    },
  };
}
