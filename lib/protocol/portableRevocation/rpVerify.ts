// FILE: lib/protocol/portableRevocation/rpVerify.ts
// Relying-party portable revocation verification (issuer bind + checkpoint + bootstrap).

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";
import type {
  PortableRevocationBootstrapTrust,
  PortableRevocationSignedArtifact,
} from "./contract";
import type { PortableRevocationCheckpointStore } from "./checkpointStore";
import { validatePortableRevocationFreshness } from "./freshness";
import {
  resolveAuthorizedRevocationIssuerForReceipt,
  type PortableRevocationIssuerTrustPolicy,
} from "./issuerAuthority";
import { portableRevocationStatusId } from "./statusId";
import {
  verifyPortableRevocationArtifact,
  type PortableRevocationVerification,
  type PortableRevocationVerifyCode,
} from "./verify";

function bootstrapMatches(
  artifact: PortableRevocationSignedArtifact,
  trusted: PortableRevocationBootstrapTrust,
  authorizedIssuerId: string,
): boolean {
  return (
    trusted.revocation_issuer_id === authorizedIssuerId
    && trusted.snapshot_sequence === artifact.payload.snapshot_sequence
    && trusted.trusted_payload_hash === artifact.payload_hash
    && trusted.snapshot_signing_key_id === artifact.payload.signing_key_id
  );
}

function mapAdvanceFailure(code: string): PortableRevocationVerifyCode {
  if (code === "rollback_rejected") return "rollback_against_checkpoint";
  if (code === "hash_conflict_at_sequence") return "hash_conflict_at_sequence";
  if (code === "chain_continuity_break") return "chain_continuity_break";
  if (code === "bootstrap_bypass_rejected") return "bootstrap_bypass_rejected";
  if (code === "checkpoint_unavailable") return "checkpoint_unavailable";
  if (code === "corrupt_checkpoint") return "checkpoint_storage_unavailable";
  return "checkpoint_storage_unavailable";
}

export type VerifyPortableRevocationAtRelyingPartyInput = {
  artifact: PortableRevocationSignedArtifact;
  receipt: DecisionReceiptRecord;
  now?: Date;
  env?: Record<string, string | undefined>;
  issuerTrust: PortableRevocationIssuerTrustPolicy;
  checkpointStore: PortableRevocationCheckpointStore;
  bootstrapTrusts?: PortableRevocationBootstrapTrust[];
  clockSkewSeconds?: number;
  advanceCheckpointOnSuccess?: boolean;
};

export type VerifyPortableRevocationAtRelyingPartyResult = {
  verification: PortableRevocationVerification;
  revocationSource: RevocationSourceState;
  checkpoint_advanced: boolean;
};

export async function verifyPortableRevocationAtRelyingParty(
  input: VerifyPortableRevocationAtRelyingPartyInput,
): Promise<VerifyPortableRevocationAtRelyingPartyResult> {
  const now = input.now ?? new Date();
  const codes: PortableRevocationVerifyCode[] = [];
  const bootstrapTrusts = input.bootstrapTrusts ?? [];

  const authority = resolveAuthorizedRevocationIssuerForReceipt(input.receipt, input.issuerTrust);
  if (!authority.ok) {
    codes.push(
      authority.code === "issuer_trust_unconfigured"
        ? "issuer_trust_unconfigured"
        : "issuer_authority_mismatch",
    );
    const verification: PortableRevocationVerification = {
      ok: false,
      codes,
      snapshot_sequence: input.artifact.payload.snapshot_sequence,
      issuer_id: input.artifact.payload.issuer_id,
    };
    return {
      verification,
      revocationSource: { available: false, reason: "unavailable" },
      checkpoint_advanced: false,
    };
  }

  const crypto = verifyPortableRevocationArtifact({
    artifact: input.artifact,
    now,
    env: input.env,
  });
  codes.push(...crypto.codes);

  codes.push(
    ...validatePortableRevocationFreshness({
      payload: input.artifact.payload,
      now,
      clockSkewSeconds: input.clockSkewSeconds,
    }),
  );

  if (input.artifact.payload.issuer_id !== authority.revocation_issuer_id) {
    codes.push("issuer_authority_mismatch");
  }
  if (!authority.snapshot_signing_key_ids.includes(input.artifact.payload.signing_key_id)) {
    codes.push("snapshot_signing_key_unauthorized");
  }

  let structuralOk = codes.length === 0;
  let checkpoint_advanced = false;

  if (structuralOk && input.advanceCheckpointOnSuccess !== false) {
    const bootstrapped = bootstrapTrusts.some((row) =>
      bootstrapMatches(input.artifact, row, authority.revocation_issuer_id),
    );
    const advance = await input.checkpointStore.compareAndAdvanceCheckpoint({
      revocation_issuer_id: authority.revocation_issuer_id,
      highest_sequence: input.artifact.payload.snapshot_sequence,
      last_payload_hash: input.artifact.payload_hash,
      updated_at: now.toISOString(),
      previous_snapshot_hash: input.artifact.payload.previous_snapshot_hash,
      bootstrapped,
    });
    if (!advance.ok) {
      codes.push(mapAdvanceFailure(advance.code));
      structuralOk = false;
    } else {
      checkpoint_advanced = advance.advanced;
    }
  }

  const verification: PortableRevocationVerification = {
    ok: structuralOk,
    codes,
    snapshot_sequence: input.artifact.payload.snapshot_sequence,
    issuer_id: authority.revocation_issuer_id,
  };

  if (!structuralOk) {
    return {
      verification,
      revocationSource: { available: false, reason: "unavailable" },
      checkpoint_advanced: false,
    };
  }

  const statusId = portableRevocationStatusId(
    input.receipt.id,
    authority.revocation_issuer_id,
  );
  const entry = input.artifact.payload.status_entries.find((row) => row.status_id === statusId);
  if (!entry) {
    verification.ok = false;
    verification.codes.push("receipt_not_in_snapshot");
    return {
      verification,
      revocationSource: { available: false, reason: "unavailable" },
      checkpoint_advanced,
    };
  }
  if (entry.state === "revoked") {
    verification.ok = false;
    verification.codes.push("receipt_revoked");
    return {
      verification,
      revocationSource: { available: true, status: "revoked" },
      checkpoint_advanced,
    };
  }

  return {
    verification,
    revocationSource: { available: true, status: "active" },
    checkpoint_advanced,
  };
}
