// FILE: lib/protocolVerification/sandboxPresentationBinding.ts
// Binds prepared credential evidence to session, workspace, policy, and wallet before authorization.

import { createHash } from "crypto";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";

export function hashSandboxCredentialPresentationBundle(input: {
  policy_id: string;
  policy_version: number;
  workspace_id: string;
  wallet_address: string;
  credential: SignedPassportReusableCredential;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
}): string {
  const material = [
    input.policy_id,
    String(input.policy_version),
    input.workspace_id,
    input.wallet_address.trim(),
    input.credential.payload.credential_id,
    input.credential.payload_hash,
    input.portable_revocation_snapshot.payload_hash,
  ].join("|");
  return createHash("sha256").update(material, "utf8").digest("hex");
}

export function hashesSubmittedEvidenceMatchCommit(input: {
  commit_hash: string;
  policy_id: string;
  policy_version: number;
  workspace_id: string;
  wallet_address: string;
  credential: SignedPassportReusableCredential;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
}): boolean {
  const computed = hashSandboxCredentialPresentationBundle({
    policy_id: input.policy_id,
    policy_version: input.policy_version,
    workspace_id: input.workspace_id,
    wallet_address: input.wallet_address,
    credential: input.credential,
    portable_revocation_snapshot: input.portable_revocation_snapshot,
  });
  return computed === input.commit_hash;
}
