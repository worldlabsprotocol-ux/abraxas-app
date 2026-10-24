// FILE: lib/partner/portableIndependentVerification/buildPortableVerificationBundle.ts
// Export independently verifiable artifacts for a Partner Flow decision receipt.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { toPublicView } from "@/lib/decisionReceipts/views";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import { evaluatePortableExportCurrentValidity } from "./evaluatePortableExportCurrentValidity";
import {
  type SignedIssuerAuthorityStatement,
  type SignedReceiptStatusStatement,
  type TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import { assessPortableVerificationReadiness } from "./assessReadiness";

export type PortableVerificationBundle = {
  schema: "abraxas_portable_verification_bundle/1.0.0";
  decision_receipt: DecisionReceiptRecord;
  /** Informational copy shipped with the export — not trusted until matched to an integrator pin. */
  bundled_trust_anchor: TrustAnchorBundleV1;
  /** @deprecated Use bundled_trust_anchor — same value, misleading name. */
  pinned_trust_anchor: TrustAnchorBundleV1;
  signed_issuer_authority: SignedIssuerAuthorityStatement;
  signed_status_statement: SignedReceiptStatusStatement;
  registry_version: number;
  export_provenance: {
    trust_anchor_must_be_independently_pinned: true;
    bundled_trust_anchor_informational_only: true;
    status_evidence_authoritative: boolean;
    status_evidence_source:
      | "sovereign_pg_evaluation"
      | "operational_demo_store"
      | "unavailable";
  };
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
}): Promise<
  | { ok: true; statement: SignedReceiptStatusStatement; authoritative: true }
  | { ok: false; reason: string }
> {
  const anchorPublic = loadAnchorPublicJwk(input.env);
  if (!anchorPublic) return { ok: false, reason: "trust_anchor_public_jwk_missing" };

  let evaluation;
  try {
    evaluation = await evaluatePortableExportCurrentValidity({
      record: input.record,
      signedIssuerAuthority: input.signedIssuerAuthority,
      trustAnchorPublicJwk: anchorPublic,
      env: input.env,
    });
  } catch {
    return { ok: false, reason: "portable_export_validity_evaluation_failed" };
  }

  const sovereignStatus = await publishSignedReceiptStatusFromSovereignEvaluation({
    record: input.record,
    evaluation,
    signedIssuerAuthorityEnvironment: verifierEnvironment(input.record),
    env: input.env,
  });
  if (!("payload" in sovereignStatus)) {
    return { ok: false, reason: sovereignStatus.reason };
  }
  return { ok: true, statement: sovereignStatus, authoritative: true };
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
  if (!signedStatus.ok) {
    return { ok: false, reason: signedStatus.reason };
  }

  const bundledAnchor = buildTrustAnchorBundleV1({
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
      bundled_trust_anchor: bundledAnchor,
      pinned_trust_anchor: bundledAnchor,
      signed_issuer_authority: signedIssuer,
      signed_status_statement: signedStatus.statement,
      registry_version: registryVersion,
      export_provenance: {
        trust_anchor_must_be_independently_pinned: true,
        bundled_trust_anchor_informational_only: true,
        status_evidence_authoritative: signedStatus.authoritative,
        status_evidence_source: evaluation.source,
      },
    },
  };
}
