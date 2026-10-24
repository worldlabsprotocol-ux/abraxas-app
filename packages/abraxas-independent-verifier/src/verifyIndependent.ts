import {
  RECEIPT_STATUS_EVIDENCE_DOCUMENT,
  RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION,
  type DecisionReceiptRecord,
  type ReceiptStatusEvidenceV1,
  type RelyingPartyExpectations,
  type SignedIssuerAuthorityStatement,
  type TrustAnchorBundleV1,
} from "./types";
import { assertStatementMatchesPinnedAnchor, validateTrustAnchorBundle } from "./trustAnchorBundle";
import { resolveIssuerKeyFromSignedStatement } from "./issuerAuthorityStatement";
import { verifyReceiptPayloadIntegrity, verifyReceiptSignatureWithPublicJwk } from "./receiptVerify";

export type IndependentVerificationPhase = {
  id: string;
  status: "pass" | "fail" | "blocked" | "skipped";
  detail: string;
};

export type IndependentVerificationResult = {
  contract_version: "abraxas_independent_verifier/1.0.0";
  cryptographically_authentic: boolean;
  issuer_currently_authorized: boolean;
  policy_and_audience_match: boolean;
  /** Never true from signature alone — requires fresh status evidence when mandated. */
  currently_acceptable: "yes" | "no" | "indeterminate";
  phases: IndependentVerificationPhase[];
  failure_codes: string[];
  disclaimer: string;
};

function validateStatusEvidence(
  evidence: ReceiptStatusEvidenceV1,
  record: DecisionReceiptRecord,
  maxAgeSeconds: number,
  now: Date,
): { ok: true } | { ok: false; reason: string } {
  if (evidence.document !== RECEIPT_STATUS_EVIDENCE_DOCUMENT) {
    return { ok: false, reason: "invalid_status_evidence_document" };
  }
  if (evidence.schema_version !== RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION) {
    return { ok: false, reason: "unsupported_status_evidence_schema" };
  }
  if (evidence.receipt_id !== record.id) return { ok: false, reason: "status_evidence_receipt_mismatch" };
  const observed = Date.parse(evidence.observed_at);
  if (Number.isNaN(observed)) return { ok: false, reason: "status_evidence_observed_at_invalid" };
  if (now.getTime() - observed > maxAgeSeconds * 1000) {
    return { ok: false, reason: "status_evidence_stale" };
  }
  return { ok: true };
}

export function verifyAbraxasReceiptIndependently(input: {
  record: DecisionReceiptRecord;
  pinnedTrustAnchor: TrustAnchorBundleV1;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  relyingParty: RelyingPartyExpectations;
  /** When the SIAS was obtained (for cache policy). Omit only in tests. */
  statementObservedAt?: string;
  statusEvidence?: ReceiptStatusEvidenceV1 | null;
  minimumRegistryVersion?: number;
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
    return finish(false, false, false, "indeterminate", phases, failure_codes);
  }
  push("pinned_trust_anchor", "pass", "Pinned trust anchor bundle validated (out-of-band).");

  if (input.pinnedTrustAnchor.environment !== input.relyingParty.environment) {
    push("environment", "fail", "Trust anchor environment does not match relying party.", "cross_environment");
    return finish(false, false, false, "no", phases, failure_codes);
  }

  const anchorMatch = assertStatementMatchesPinnedAnchor({
    bundle: input.pinnedTrustAnchor,
    statementAnchorKeyId: input.signedIssuerAuthority.anchor_key_id,
  });
  if (!anchorMatch.ok) {
    push("anchor_binding", "fail", anchorMatch.reason, anchorMatch.reason);
    return finish(false, false, false, "no", phases, failure_codes);
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

  let currentlyAcceptable: IndependentVerificationResult["currently_acceptable"] = "indeterminate";
  if (!input.statusEvidence) {
    push(
      "current_acceptability",
      "blocked",
      "No authenticated status evidence — current acceptability indeterminate.",
    );
    failure_codes.push("status_evidence_required");
  } else {
    const evOk = validateStatusEvidence(
      input.statusEvidence,
      input.record,
      input.pinnedTrustAnchor.statement_cache_max_age_seconds,
      now,
    );
    if (!evOk.ok) {
      push("status_evidence", "fail", evOk.reason, evOk.reason);
      currentlyAcceptable = "no";
    } else {
      push("status_evidence", "pass", "Status evidence fresh and bound to receipt.");
      const ev = input.statusEvidence;
      const liveOk =
        cryptographicallyAuthentic
        && issuerAuthorized
        && audienceMatch
        && ev.receipt_status === "active"
        && !ev.superseded
        && ev.partner_operational
        && ev.policy_active
        && ev.claims_current
        && ev.evidence_current
        && input.record.decision_result === "approved";
      currentlyAcceptable = liveOk ? "yes" : "no";
      push(
        "current_acceptability",
        liveOk ? "pass" : "fail",
        liveOk
          ? "Receipt currently acceptable under supplied status evidence."
          : "Receipt not currently acceptable (revocation, supersession, policy, or evidence).",
        liveOk ? undefined : "not_currently_acceptable",
      );
    }
  }

  return finish(
    cryptographicallyAuthentic,
    issuerAuthorized,
    audienceMatch,
    currentlyAcceptable,
    phases,
    failure_codes,
  );
}

function finish(
  cryptographicallyAuthentic: boolean,
  issuerAuthorized: boolean,
  audienceMatch: boolean,
  currentlyAcceptable: IndependentVerificationResult["currently_acceptable"],
  phases: IndependentVerificationPhase[],
  failure_codes: string[],
): IndependentVerificationResult {
  return {
    contract_version: "abraxas_independent_verifier/1.0.0",
    cryptographically_authentic: cryptographicallyAuthentic,
    issuer_currently_authorized: issuerAuthorized,
    policy_and_audience_match: audienceMatch,
    currently_acceptable: currentlyAcceptable,
    phases,
    failure_codes: Array.from(new Set(failure_codes)),
    disclaimer:
      "HTTPS retrieval of issuer authority does not establish trust. Pin the anchor out-of-band. "
      + "Valid signatures do not imply current authorization without fresh authenticated status evidence.",
  };
}
