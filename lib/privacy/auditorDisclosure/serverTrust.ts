// FILE: lib/privacy/auditorDisclosure/serverTrust.ts
// Verify-only issuer authority for read paths — no anchor private key re-signing per disclosure.

import { issuerAuthorityStateDigest } from "@abraxas/independent-verifier";
import type { SignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/contract";
import {
  buildIssuerAuthorityStatementFromRegistry,
  loadIssuerAuthorityState,
} from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  readConfiguredIssuerAnchor,
  readCurrentIssuerAuthorityRow,
} from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import { verifySignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/signVerify";

export type AuthoritativeAuditorDisclosureTrust = {
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  environment: "demo" | "production";
  minimumRegistryVersion: number;
};

function parseRevokedMandateIds(env: Record<string, string | undefined>): Set<string> {
  const raw = env.ABRAXAS_AUDITOR_DISCLOSURE_REVOKED_MANDATES?.trim();
  if (!raw) return new Set();
  return new Set(raw.split(",").map((id) => id.trim()).filter(Boolean));
}

export function isAuditorMandateRevokedInRegistry(mandateId: string, env: Record<string, string | undefined> = process.env): boolean {
  return parseRevokedMandateIds(env).has(mandateId);
}

function loadPublishedSignedIssuerAuthority(
  env: Record<string, string | undefined>,
): SignedIssuerAuthorityStatement | { ok: false; reason: string } {
  const raw = env.ABRAXAS_PUBLISHED_SIGNED_ISSUER_AUTHORITY_JSON?.trim();
  if (!raw) return { ok: false, reason: "published_issuer_authority_unconfigured" };
  try {
    return JSON.parse(raw) as SignedIssuerAuthorityStatement;
  } catch {
    return { ok: false, reason: "published_issuer_authority_invalid" };
  }
}

export async function resolveAuthoritativeAuditorDisclosureTrust(
  env: Record<string, string | undefined> = process.env,
): Promise<
  | { ok: true; trust: AuthoritativeAuditorDisclosureTrust }
  | { ok: false; reason: string }
> {
  const anchor = readConfiguredIssuerAnchor(env);
  if (!anchor.ok) return anchor;

  const state = loadIssuerAuthorityState(env);
  if (!state.ok) return state;

  const recorded = await readCurrentIssuerAuthorityRow({
    env,
    environment: state.environment,
  });
  if (!recorded.ok) return recorded;
  if (!recorded.row) return { ok: false, reason: "authority_bootstrap_required" };

  const published = loadPublishedSignedIssuerAuthority(env);
  if ("ok" in published && published.ok === false) return published;

  const built = buildIssuerAuthorityStatementFromRegistry({
    registryVersion: recorded.row.registryVersion,
    supersedesRegistryVersion: recorded.row.supersedesRegistryVersion,
    anchorKeyId: anchor.anchorKeyId,
    env,
  });
  if (!built.ok) return built;

  const currentDigest = issuerAuthorityStateDigest(built.payload);
  if (currentDigest !== recorded.row.authorityStateDigest) {
    return { ok: false, reason: "recorded_authority_mismatch" };
  }

  const statement = published as SignedIssuerAuthorityStatement;
  if (issuerAuthorityStateDigest(statement.payload) !== recorded.row.authorityStateDigest) {
    return { ok: false, reason: "published_issuer_authority_stale" };
  }

  const verified = verifySignedIssuerAuthorityStatement({
    statement,
    trustAnchorPublicJwk: anchor.anchorPublicJwk,
    acceptedRegistryVersion: recorded.row.registryVersion,
    expectedAuthorityStateDigest: recorded.row.authorityStateDigest,
  });
  if (!verified.ok) return verified;

  if (statement.payload.environment !== state.environment) {
    return { ok: false, reason: "published_issuer_authority_environment_mismatch" };
  }

  return {
    ok: true,
    trust: {
      signedIssuerAuthority: statement,
      trustAnchorPublicJwk: anchor.anchorPublicJwk,
      environment: state.environment,
      minimumRegistryVersion: recorded.row.registryVersion,
    },
  };
}