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

function evaluateCheckpointContinuity(input: {
  artifact: PortableRevocationSignedArtifact;
  authorizedIssuerId: string;
  checkpoint: Awaited<ReturnType<PortableRevocationCheckpointStore["getCheckpoint"]>>;
  bootstrapTrusts: PortableRevocationBootstrapTrust[];
}): PortableRevocationVerifyCode[] {
  const codes: PortableRevocationVerifyCode[] = [];
  const { artifact, checkpoint, bootstrapTrusts, authorizedIssuerId } = input;
  const bootstrapped = bootstrapTrusts.some((row) =>
    bootstrapMatches(artifact, row, authorizedIssuerId),
  );

  if (!checkpoint) {
    if (!bootstrapped) {
      codes.push("checkpoint_unavailable");
    }
    return codes;
  }

  const seq = artifact.payload.snapshot_sequence;
  if (seq < checkpoint.highest_sequence) {
    codes.push("rollback_against_checkpoint");
    return codes;
  }

  if (seq === checkpoint.highest_sequence) {
    if (artifact.payload_hash !== checkpoint.last_payload_hash) {
      codes.push("chain_continuity_break");
    }
    return codes;
  }

  if (seq === checkpoint.highest_sequence + 1) {
    if (artifact.payload.previous_snapshot_hash !== checkpoint.last_payload_hash) {
      codes.push("chain_continuity_break");
    }
    return codes;
  }

  if (!bootstrapped) {
    codes.push("chain_continuity_break");
  }
  return codes;
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

  const checkpoint = await input.checkpointStore.getCheckpoint(authority.revocation_issuer_id);
  codes.push(
    ...evaluateCheckpointContinuity({
      artifact: input.artifact,
      authorizedIssuerId: authority.revocation_issuer_id,
      checkpoint,
      bootstrapTrusts,
    }),
  );

  const structuralOk = codes.length === 0;
  let checkpoint_advanced = false;
  if (structuralOk && input.advanceCheckpointOnSuccess !== false) {
    const shouldAdvance =
      !checkpoint
      || input.artifact.payload.snapshot_sequence > checkpoint.highest_sequence;
    if (shouldAdvance) {
      await input.checkpointStore.setCheckpoint({
        revocation_issuer_id: authority.revocation_issuer_id,
        highest_sequence: input.artifact.payload.snapshot_sequence,
        last_payload_hash: input.artifact.payload_hash,
        updated_at: now.toISOString(),
      });
      checkpoint_advanced = true;
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
