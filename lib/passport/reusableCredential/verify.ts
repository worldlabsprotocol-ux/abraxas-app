// FILE: lib/passport/reusableCredential/verify.ts

import type {
  PortableRevocationBootstrapTrust,
  PortableRevocationCheckpointStore,
  PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import { resolvePassportCredentialIssuerTrust } from "./credentialIssuerRegistry";
import { verifyCredentialPortableRevocationStrict } from "./credentialRevocationStrict";
import type { SignedPassportReusableCredential } from "./contract";
import { verifyPassportReusableCredentialSignature } from "./sign";

export type PassportCredentialVerifyFailure =
  | "invalid_signature"
  | "expired"
  | "issuer_registry_missing"
  | "issuer_untrusted"
  | "signing_key_mismatch"
  | "revocation_verification_failed"
  | "credential_revoked_or_unknown"
  | "missing_revocation_snapshot";

export type PassportCredentialVerifyResult =
  | { ok: true; registryEntry: import("./credentialIssuerRegistry").PassportCredentialIssuerRegistryEntry }
  | { ok: false; code: PassportCredentialVerifyFailure; detail?: string[] };

export async function verifyPassportReusableCredentialStrict(input: {
  credential: SignedPassportReusableCredential;
  now?: Date;
  env?: Record<string, string | undefined>;
  portableRevocationSnapshot: PortableRevocationSignedArtifact;
  checkpointStore: PortableRevocationCheckpointStore;
  bootstrapTrusts?: PortableRevocationBootstrapTrust[];
}): Promise<PassportCredentialVerifyResult> {
  const { credential } = input;
  const trust = resolvePassportCredentialIssuerTrust({
    issuerId: credential.payload.issuer_id,
    signingKeyId: credential.payload.signing_key_id,
    env: input.env,
  });
  if (!trust.ok) {
    return { ok: false, code: trust.code };
  }
  if (!verifyPassportReusableCredentialSignature(credential, trust.entry.public_jwk)) {
    return { ok: false, code: "invalid_signature" };
  }
  const now = input.now ?? new Date();
  if (Date.parse(credential.payload.expires_at) < now.getTime()) {
    return { ok: false, code: "expired" };
  }
  if (!input.portableRevocationSnapshot) {
    return { ok: false, code: "missing_revocation_snapshot" };
  }
  const rev = await verifyCredentialPortableRevocationStrict({
    credential,
    artifact: input.portableRevocationSnapshot,
    registryEntry: trust.entry,
    checkpointStore: input.checkpointStore,
    bootstrapTrusts: input.bootstrapTrusts,
    now,
    env: input.env,
  });
  if (!rev.ok) {
    return {
      ok: false,
      code:
        rev.code === "credential_revoked_or_unknown"
          ? "credential_revoked_or_unknown"
          : "revocation_verification_failed",
      detail: rev.codes,
    };
  }
  return { ok: true, registryEntry: trust.entry };
}
