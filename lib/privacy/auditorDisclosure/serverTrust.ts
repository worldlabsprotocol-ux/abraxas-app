// FILE: lib/privacy/auditorDisclosure/serverTrust.ts
// Server-side issuer authority + trust anchor resolution (never from request body).

import type { SignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/contract";
import {
  buildIssuerAuthorityStatementFromRegistry,
  loadIssuerAuthorityState,
} from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  readConfiguredIssuerAnchor,
  readCurrentIssuerAuthorityRow,
} from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";

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

  const privateRaw = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK?.trim();
  if (!privateRaw) return { ok: false, reason: "authoritative_issuer_signer_unavailable" };
  let anchorPrivateJwk: JsonWebKey;
  try {
    anchorPrivateJwk = JSON.parse(privateRaw) as JsonWebKey;
  } catch {
    return { ok: false, reason: "authoritative_issuer_signer_invalid" };
  }

  const built = buildIssuerAuthorityStatementFromRegistry({
    registryVersion: recorded.row.registryVersion,
    supersedesRegistryVersion: recorded.row.supersedesRegistryVersion,
    anchorKeyId: anchor.anchorKeyId,
    env,
  });
  if (!built.ok) return built;

  const signed = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: recorded.row.registryVersion,
    supersedesRegistryVersion: recorded.row.supersedesRegistryVersion,
    anchorKeyId: anchor.anchorKeyId,
    anchorPrivateJwk,
    env,
  });
  if (typeof signed === "object" && "ok" in signed && signed.ok === false) return signed;

  return {
    ok: true,
    trust: {
      signedIssuerAuthority: signed as SignedIssuerAuthorityStatement,
      trustAnchorPublicJwk: anchor.anchorPublicJwk,
      environment: state.environment,
      minimumRegistryVersion: recorded.row.registryVersion,
    },
  };
}