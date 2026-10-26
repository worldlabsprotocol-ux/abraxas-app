import type {
  DecisionReceiptRecord,
  ReceiptStatusEvidenceV1,
  RelyingPartyExpectations,
  SignedIssuerAuthorityStatement,
  SignedReceiptStatusStatement,
  TrustAnchorBundleV1,
} from "./types";
import { assertStatementMatchesPinnedAnchor, validateTrustAnchorBundle } from "./trustAnchorBundle";
import { resolveIssuerKeyFromSignedStatement } from "./issuerAuthorityStatement";
import { verifyReceiptPayloadIntegrity, verifyReceiptSignatureWithPublicJwk } from "./receiptVerify";
import {
  statusPayloadMatchesReceiptContext,
  verifySignedReceiptStatusStatement,
} from "./signedReceiptStatusStatement";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "./v1_1_0/constants";
import {
  assessManifestReferencePrivacy,
  evaluateApplicationBindingRequirement,
  evaluateEvidenceCommitmentRequirement,
} from "./v1_1_0/enforcement";

export type IndependentVerificationPhase = {
  id: string;
  status: "pass" | "fail" | "blocked" | "skipped";
  detail: string;
};

export type IndependentVerificationResult = {
  contract_version: "abraxas_independent_verifier/1.1.0";
  cryptographically_authentic: boolean;
  issuer_currently_authorized: boolean;
  policy_and_audience_match: boolean;
  status_evidence_authentic: boolean;
  /** Never true from signature alone — requires authenticated signed status evidence. */
  currently_acceptable: "yes" | "no" | "indeterminate";
  phases: IndependentVerificationPhase[];
  failure_codes: string[];
  disclaimer: string;
};

function statusMaxAgeSeconds(bundle: TrustAnchorBundleV1): number {
  return bundle.status_statement_max_age_seconds ?? bundle.statement_cache_max_age_seconds;
}

/** @deprecated Unsigned JSON is not authenticated — fails closed in v1.1.0+ */
function rejectUnsignedStatusEvidence(): { ok: false; reason: string } {
  return { ok: false, reason: "unsigned_status_evidence_rejected" };
}

export function verifyAbraxasReceiptIndependently(input: {
  record: DecisionReceiptRecord;
  pinnedTrustAnchor: TrustAnchorBundleV1;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  relyingParty: RelyingPartyExpectations;
  statementObservedAt?: string;
  /** Build #819 — required for current acceptability. */
  signedStatusStatement?: SignedReceiptStatusStatement | null;
  /** @deprecated Use signedStatusStatement */
  statusEvidence?: ReceiptStatusEvidenceV1 | null;
  minimumRegistryVersion?: number;
  minimumStatusVersion?: number;
  now?: Date;
}): IndependentVerificationResult {
  const now = input.now ?? new Date();
  const phases: IndependentVerificationPhase[] = [];
  const failure_codes: string[] = [];
  const push = (id: string, status: IndependentVerificationPhase["status"], detail: string, code?: string) => {
    phases.push({ id, status, detail });
    if (code && (status === "fail" || status === "blocked")) failure_codes.push(code);
  };

  const bundleOk = validateTrustAnchorBundle(input.pinnedTrustAnchor);
  if (!bundleOk.ok) {
    push("pinned_trust_anchor", "fail", bundleOk.reason, bundleOk.reason);
    return finish(false, false, false, false, "indeterminate", phases, failure_codes);
  }
  push("pinned_trust_anchor", "pass", "Pinned trust anchor bundle validated (out-of-band).");

  if (input.pinnedTrustAnchor.environment !== input.relyingParty.environment) {
    push("environment", "fail", "Trust anchor environment does not match relying party.", "cross_environment");
    return finish(false, false, false, false, "no", phases, failure_codes);
  }

  const anchorMatch = assertStatementMatchesPinnedAnchor({
    bundle: input.pinnedTrustAnchor,
    statementAnchorKeyId: input.signedIssuerAuthority.anchor_key_id,
  });
  if (!anchorMatch.ok) {
    push("anchor_binding", "fail", anchorMatch.reason, anchorMatch.reason);
    return finish(false, false, false, false, "no", phases, failure_codes);
  }
  push("anchor_binding", "pass", "Statement anchor matches integrator-pinned anchor (no substitution).");

  if (input.statementObservedAt) {
    const observed = Date.parse(input.statementObservedAt);
    if (
      Number.isNaN(observed)
      || now.getTime() - observed > input.pinnedTrustAnchor.statement_cache_max_age_seconds * 1000
    ) {
      push("statement_freshness", "fail", "Signed issuer authority statement is stale.", "statement_stale");
    } else {
      push("statement_freshness", "pass", "Statement within cache max-age policy.");
    }
  } else {
    push("statement_freshness", "blocked", "Statement observation time not provided — freshness not established.");
    failure_codes.push("statement_freshness_unknown");
  }

  const runtimeEnv = input.relyingParty.environment;
  const integrity = verifyReceiptPayloadIntegrity(input.record);
  push(
    "payload_integrity",
    integrity ? "pass" : "fail",
    integrity ? "Payload hash matches canonical body." : "Payload tampered.",
    integrity ? undefined : "payload_tampered",
  );

  const sigKey = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.pinnedTrustAnchor.public_jwk,
    keyId: input.record.signing_key_id,
    schemaVersion: input.record.schema_version,
    environment: runtimeEnv,
    mode: "signature_verification",
    now,
    minimumRegistryVersion: input.minimumRegistryVersion,
  });
  let cryptographicallyAuthentic = false;
  if (!sigKey.ok) {
    push("issuer_key_signature", "fail", sigKey.reason, sigKey.reason);
  } else {
    const sigOk = verifyReceiptSignatureWithPublicJwk(input.record, sigKey.key.public_jwk);
    cryptographicallyAuthentic = integrity && sigOk;
    push(
      "receipt_signature",
      sigOk ? "pass" : "fail",
      sigOk ? "Ed25519 receipt signature verified." : "Receipt signature invalid.",
      sigOk ? undefined : "signature_invalid",
    );
  }

  const authKey = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.pinnedTrustAnchor.public_jwk,
    keyId: input.record.signing_key_id,
    schemaVersion: input.record.schema_version,
    environment: runtimeEnv,
    mode: "current_authorization",
    now,
    minimumRegistryVersion: input.minimumRegistryVersion,
  });
  const issuerAuthorized = authKey.ok;
  push(
    "issuer_current_authorization",
    issuerAuthorized ? "pass" : "fail",
    issuerAuthorized ? "Signing key currently authorized." : `Not authorized: ${authKey.ok ? "" : authKey.reason}`,
    issuerAuthorized ? undefined : authKey.ok ? undefined : authKey.reason,
  );

  const audienceMatch =
    input.record.partner_id === input.relyingParty.partner_id
    && input.record.policy_id === input.relyingParty.policy_id
    && (runtimeEnv === "production"
      ? input.record.decision_context === "production"
      : input.record.decision_context === "sandbox_only");
  push(
    "policy_audience",
    audienceMatch ? "pass" : "fail",
    audienceMatch ? "Partner and policy binding match." : "Partner, policy, or environment mismatch.",
    audienceMatch ? undefined : "audience_mismatch",
  );

  let v11ScopeSatisfied = true;

  const appBinding = evaluateApplicationBindingRequirement({
    record: input.record,
    policy: {
      require_application_binding: input.relyingParty.require_application_binding,
      application_binding_ref: input.relyingParty.application_binding_ref,
    },
  });
  push(
    "application_binding",
    appBinding.status,
    appBinding.detail,
    appBinding.status === "fail" ? appBinding.code : undefined,
  );
  if (appBinding.status === "fail") v11ScopeSatisfied = false;

  const evidenceBinding = evaluateEvidenceCommitmentRequirement({
    record: input.record,
    policy: {
      require_evidence_commitment: input.relyingParty.require_evidence_commitment,
      evidence_commitment_manifest: input.relyingParty.evidence_commitment_manifest,
    },
  });
  push(
    "evidence_commitment",
    evidenceBinding.status,
    evidenceBinding.detail,
    evidenceBinding.status === "fail" ? evidenceBinding.code : undefined,
  );
  if (evidenceBinding.status === "fail") v11ScopeSatisfied = false;

  if (input.relyingParty.evidence_commitment_manifest?.length) {
    const privacy = assessManifestReferencePrivacy(input.relyingParty.evidence_commitment_manifest);
    push(
      "evidence_manifest_privacy",
      privacy.status,
      privacy.detail,
      privacy.status === "fail" ? privacy.code : undefined,
    );
    if (privacy.status === "fail") v11ScopeSatisfied = false;
  }

  let statusEvidenceAuthentic = false;
  let currentlyAcceptable: IndependentVerificationResult["currently_acceptable"] = "indeterminate";

  if (input.statusEvidence && !input.signedStatusStatement) {
    const unsigned = rejectUnsignedStatusEvidence();
    push("signed_status_evidence", "fail", unsigned.reason, unsigned.reason);
    failure_codes.push(unsigned.reason);
    currentlyAcceptable = "no";
  } else if (!input.signedStatusStatement) {
    push(
      "signed_status_evidence",
      "blocked",
      "No signed status statement — current acceptability indeterminate.",
    );
    failure_codes.push("signed_status_evidence_required");
  } else {
    const signed = input.signedStatusStatement;
    const auth = verifySignedReceiptStatusStatement({
      signedStatus: signed,
      signedIssuerAuthority: input.signedIssuerAuthority,
      minimumStatusVersion: input.minimumStatusVersion,
      now,
    });
    if (!auth.ok) {
      push("signed_status_evidence", "fail", auth.reason, auth.reason);
      currentlyAcceptable = "no";
    } else {
      const ctx = statusPayloadMatchesReceiptContext({
        payload: signed.payload,
        receiptId: input.record.id,
        partnerId: input.relyingParty.partner_id,
        policyId: input.relyingParty.policy_id,
        policyVersion: input.record.policy_version,
        environment: runtimeEnv,
      });
      if (!ctx.ok) {
        push("status_context_binding", "fail", ctx.reason, ctx.reason);
        currentlyAcceptable = "no";
      } else {
        const issuedAt = Date.parse(signed.payload.issued_at);
        const maxAge = statusMaxAgeSeconds(input.pinnedTrustAnchor) * 1000;
        if (Number.isNaN(issuedAt) || now.getTime() - issuedAt > maxAge) {
          push("status_freshness", "fail", "Signed status statement exceeds freshness policy.", "status_statement_stale");
          currentlyAcceptable = "no";
        } else {
          statusEvidenceAuthentic = true;
          push("signed_status_evidence", "pass", "Signed status statement authentic and fresh.");
          const p = signed.payload;
          const liveOk =
            cryptographicallyAuthentic
            && issuerAuthorized
            && audienceMatch
            && v11ScopeSatisfied
            && p.receipt_status === "active"
            && !p.superseded
            && p.partner_operational
            && p.policy_active
            && p.claims_current
            && p.evidence_current
            && input.record.decision_result === "approved";
          currentlyAcceptable = liveOk ? "yes" : "no";
          push(
            "current_acceptability",
            liveOk ? "pass" : "fail",
            liveOk
              ? "Receipt currently acceptable under signed status evidence."
              : "Receipt not currently acceptable (revocation, supersession, policy, or evidence).",
            liveOk ? undefined : "not_currently_acceptable",
          );
        }
      }
    }
  }

  return finish(
    cryptographicallyAuthentic,
    issuerAuthorized,
    audienceMatch,
    statusEvidenceAuthentic,
    currentlyAcceptable,
    phases,
    failure_codes,
  );
}

function finish(
  cryptographicallyAuthentic: boolean,
  issuerAuthorized: boolean,
  audienceMatch: boolean,
  statusEvidenceAuthentic: boolean,
  currentlyAcceptable: IndependentVerificationResult["currently_acceptable"],
  phases: IndependentVerificationPhase[],
  failure_codes: string[],
): IndependentVerificationResult {
  return {
    contract_version: "abraxas_independent_verifier/1.1.0",
    cryptographically_authentic: cryptographicallyAuthentic,
    issuer_currently_authorized: issuerAuthorized,
    policy_and_audience_match: audienceMatch,
    status_evidence_authentic: statusEvidenceAuthentic,
    currently_acceptable: currentlyAcceptable,
    phases,
    failure_codes: Array.from(new Set(failure_codes)),
    disclaimer:
      "Pin the trust anchor out-of-band. Issuer authority and current status require signed statements "
      + "from keys authorized in the issuer authority statement — not unauthenticated HTTP or JSON.",
  };
}
