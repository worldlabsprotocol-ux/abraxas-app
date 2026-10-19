// FILE: lib/protocolVerification/verifySandboxPresentationCommit.ts

import type { SandboxPresentationCommitRecord } from "@/lib/auth/ephemeralWallet/sandboxPresentationCommitStore";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import { hashesSubmittedEvidenceMatchCommit } from "./sandboxPresentationBinding";

export type SandboxPresentationCommitVerificationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "presentation_commit_required"
        | "presentation_commit_not_found"
        | "presentation_commit_expired"
        | "presentation_session_mismatch"
        | "presentation_workspace_mismatch"
        | "presentation_policy_mismatch"
        | "presentation_wallet_mismatch"
        | "presentation_evidence_mismatch"
        | "presentation_method_mismatch"
        | "presentation_possession_not_authorized";
    };

export function verifySandboxPresentationCommitAgainstSubmission(input: {
  commit: SandboxPresentationCommitRecord | null;
  session_id: string;
  workspace_id: string;
  wallet_address: string;
  policy_id: string;
  policy_version: number;
  presentation_method_id?: string;
  credential: SignedPassportReusableCredential;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
  now?: Date;
  require_possession_authorized?: boolean;
}): SandboxPresentationCommitVerificationResult {
  if (!input.commit) {
    return { ok: false, code: "presentation_commit_not_found" };
  }
  const now = input.now ?? new Date();
  if (Date.parse(input.commit.expires_at) < now.getTime()) {
    return { ok: false, code: "presentation_commit_expired" };
  }
  if (input.commit.session_id !== input.session_id) {
    return { ok: false, code: "presentation_session_mismatch" };
  }
  if (input.commit.workspace_id !== input.workspace_id) {
    return { ok: false, code: "presentation_workspace_mismatch" };
  }
  if (input.commit.wallet_address !== input.wallet_address.trim()) {
    return { ok: false, code: "presentation_wallet_mismatch" };
  }
  if (input.commit.policy_id !== input.policy_id) {
    return { ok: false, code: "presentation_policy_mismatch" };
  }
  if (input.commit.policy_version !== input.policy_version) {
    return { ok: false, code: "presentation_policy_mismatch" };
  }
  if (
    input.presentation_method_id
    && input.commit.presentation_method_id !== input.presentation_method_id
  ) {
    return { ok: false, code: "presentation_method_mismatch" };
  }
  const matches = hashesSubmittedEvidenceMatchCommit({
    commit_hash: input.commit.evidence_hash,
    policy_id: input.policy_id,
    policy_version: input.policy_version,
    workspace_id: input.workspace_id,
    wallet_address: input.wallet_address,
    credential: input.credential,
    portable_revocation_snapshot: input.portable_revocation_snapshot,
  });
  if (!matches) {
    return { ok: false, code: "presentation_evidence_mismatch" };
  }
  if (input.require_possession_authorized !== false && !input.commit.possession_authorized_at) {
    return { ok: false, code: "presentation_possession_not_authorized" };
  }
  return { ok: true };
}
