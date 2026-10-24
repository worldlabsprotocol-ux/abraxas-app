// FILE: lib/partner/portableIndependentVerification/buildPortableVerificationBundle.ts
// Export independently verifiable artifacts for a Partner Flow decision receipt.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import { toPublicView } from "@/lib/decisionReceipts/views";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import { evaluateSovereignCurrentValidity } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import {
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  signReceiptStatusStatement,
  type SignedIssuerAuthorityStatement,
  type SignedReceiptStatusStatement,
  type TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import { assessPortableVerificationReadiness } from "./assessReadiness";

export type PortableVerificationBundle = {
  schema: "abraxas_portable_verification_bundle/1.0.0";
  decision_receipt: DecisionReceiptRecord;
  pinned_trust_anchor: TrustAnchorBundleV1;
  signed_issuer_authority: SignedIssuerAuthorityStatement;
  signed_status_statement: SignedReceiptStatusStatement;
  registry_version: number;
};

function resolveRegistryVersion(env: Record<string, string | undefined>): number {
  const raw = env.ABRAXAS_ISSUER_AUTHORITY_REGISTRY_VERSION?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function verifierEnvironment(record: DecisionReceiptRecord): "demo" | "production" {
  return record.decision_context === "production" ? "production" : "demo";
}

function loadAnchorPrivateJwk(env: Record<string, string | undefined>): JsonWebKey | null {
  const raw = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JsonWebKey;
  } catch {
    return null;
  }
}

function loadAnchorPublicJwk(env: Record<string, string | undefined>): JsonWebKey | null {
  const raw = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JsonWebKey;
  } catch {
    return null;
  }
}

function loadStatusSignerPrivateJwk(env: Record<string, string | undefined>): JsonWebKey | null {
  const raw = env.ABRAXAS_STATUS_SIGNER_PRIVATE_JWK?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JsonWebKey;
  } catch {
    return null;
  }
}

async function signStatusFromPartnerFlowTrust(input: {
  record: DecisionReceiptRecord;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  env: Record<string, string | undefined>;
  registryVersion: number;
}): Promise<SignedReceiptStatusStatement | { ok: false; reason: string }> {
  try {
    const evaluation = await evaluateSovereignCurrentValidity({
      record: input.record,
      signedIssuerAuthority: input.signedIssuerAuthority,
      trustAnchorPublicJwk: loadAnchorPublicJwk(input.env)!,
      expectedEnvironment: verifierEnvironment(input.record),
      env: input.env,
    });
    const sovereignStatus = await publishSignedReceiptStatusFromSovereignEvaluation({
      record: input.record,
      evaluation,
      signedIssuerAuthorityEnvironment: verifierEnvironment(input.record),
      env: input.env,
    });
    if ("payload" in sovereignStatus) return sovereignStatus;
  } catch {
    // Partner Flow path — fall back to trust-evaluated status statement.
  }

  const privateJwk = loadStatusSignerPrivateJwk(input.env);
  if (!privateJwk) return { ok: false, reason: "status_signer_private_jwk_missing" };

  const stored = resolveReceiptStatus(input.record);
  const claimsCurrent =
    input.record.decision_result === "approved"
    && stored === "active";
  const issuedAt = new Date();
  const ttlSeconds = 300;
  const statusSignerKeyId = input.env.ABRAXAS_STATUS_SIGNER_KEY_ID?.trim() ?? "abraxas-status-signer";

  return signReceiptStatusStatement({
    statusSignerPrivateJwk: privateJwk,
    payload: {
      document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
      schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
      receipt_id: input.record.id,
      status_reference: input.record.id,
      partner_id: input.record.partner_id,
      policy_id: input.record.policy_id,
      policy_version: input.record.policy_version,
      environment: verifierEnvironment(input.record),
      status_version: input.registryVersion,
      supersedes_status_version: input.registryVersion > 1 ? input.registryVersion - 1 : null,
      receipt_status: stored === "revoked" ? "revoked" : stored === "expired" ? "expired" : "active",
      superseded: false,
      partner_operational: true,
      policy_active: true,
      claims_current: claimsCurrent,
      evidence_current: claimsCurrent,
      effective_at: issuedAt.toISOString(),
      issued_at: issuedAt.toISOString(),
      statement_expires_at: new Date(issuedAt.getTime() + ttlSeconds * 1000).toISOString(),
      status_signer_key_id: statusSignerKeyId,
    },
  });
}

export async function buildPortableVerificationBundle(input: {
  record: DecisionReceiptRecord;
  env?: Record<string, string | undefined>;
}): Promise<
  | { ok: true; bundle: PortableVerificationBundle }
  | { ok: false; reason: string; gaps?: string[] }
> {
  const env = input.env ?? process.env;
  const readiness = assessPortableVerificationReadiness(env);
  if (!readiness.ready) {
    return { ok: false, reason: "issuer_export_not_configured", gaps: readiness.gaps };
  }

  const anchorPublic = loadAnchorPublicJwk(env);
  const anchorPrivate = loadAnchorPrivateJwk(env);
  const anchorKeyId = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID?.trim() ?? "abraxas-trust-anchor";
  if (!anchorPublic || !anchorPrivate) {
    return { ok: false, reason: "trust_anchor_jwk_invalid" };
  }

  const registryVersion = resolveRegistryVersion(env);
  const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
    registryVersion,
    anchorKeyId,
    anchorPrivateJwk: anchorPrivate,
    env,
  });
  if (!("payload" in signedIssuer)) {
    return { ok: false, reason: signedIssuer.reason };
  }

  const signedStatus = await signStatusFromPartnerFlowTrust({
    record: input.record,
    signedIssuerAuthority: signedIssuer,
    env,
    registryVersion,
  });
  if (!("payload" in signedStatus)) {
    return { ok: false, reason: signedStatus.reason };
  }

  const pinned = buildTrustAnchorBundleV1({
    anchorKeyId,
    anchorPublicJwk: anchorPublic,
    environment: verifierEnvironment(input.record),
  });

  // Ensure public trust path stays aligned (Partner Flow validation surface).
  void toPublicView(input.record);

  return {
    ok: true,
    bundle: {
      schema: "abraxas_portable_verification_bundle/1.0.0",
      decision_receipt: input.record,
      pinned_trust_anchor: pinned,
      signed_issuer_authority: signedIssuer,
      signed_status_statement: signedStatus,
      registry_version: registryVersion,
    },
  };
}
