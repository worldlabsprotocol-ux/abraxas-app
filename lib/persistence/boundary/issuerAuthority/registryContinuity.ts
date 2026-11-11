// FILE: lib/persistence/boundary/issuerAuthority/registryContinuity.ts
// Authority-state versions. Signing another receipt does not advance the version.
// A new version requires an Ed25519 signature over that exact proposal.
//
// ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK is the issuer process's configured
// verification key. It is not the relying party's independently pinned trust root.
// Replacing it can make this process accept a different signature. It does not
// change a relying party's pin. This is cryptographic approval of one proposal.
// It is not multisignature governance and it is not non-exportable key custody.

import nacl from "tweetnacl";
import {
  canonicalizeJson,
  issuerAuthorityStateDigest,
  publicEd25519JwkFingerprint,
  verifyEd25519Detached,
} from "@abraxas/independent-verifier";
import { createHash } from "node:crypto";
import { loadIssuerAuthorityState } from "./buildFromRegistry";
import { withSovereignStagingPgTransaction } from "../sovereignStagingPg";

export const INITIAL_ISSUER_REGISTRY_VERSION = 854;
export const ISSUER_AUTHORITY_CHANGE_DOCUMENT = "abraxas_issuer_authority_change/1.0.0" as const;

export type IssuerAuthorityChangeAuthorization = {
  document: typeof ISSUER_AUTHORITY_CHANGE_DOCUMENT;
  environment: "demo" | "production";
  change: "bootstrap" | "authority_change";
  registry_version: number;
  supersedes_registry_version: number | null;
  authority_state_digest: string;
  anchor_key_id: string;
  anchor_fingerprint: string;
};

export type IssuerRegistryContinuityRow = {
  registryVersion: number;
  authorityStateDigest: string;
  supersedesRegistryVersion: number | null;
};

export type IssuerRegistryContinuityDecision =
  | {
      action: "reuse" | "insert";
      registryVersion: number;
      supersedesRegistryVersion: number | null;
    }
  | { action: "reject"; reason: string };

export function decideIssuerAuthorityContinuity(input: {
  rows: IssuerRegistryContinuityRow[];
  authorityStateDigest: string;
  authorization?: IssuerAuthorityChangeAuthorization | null;
  initialVersion?: number;
}): IssuerRegistryContinuityDecision {
  const initial = input.initialVersion ?? INITIAL_ISSUER_REGISTRY_VERSION;
  const rows = [...input.rows].sort((left, right) => left.registryVersion - right.registryVersion);
  const current = rows.at(-1);
  const authorization = input.authorization ?? null;
  if (!current) {
    if (
      authorization?.change === "bootstrap"
      && authorization.registry_version === initial
      && authorization.supersedes_registry_version == null
      && authorization.authority_state_digest === input.authorityStateDigest
    ) {
      return { action: "insert", registryVersion: initial, supersedesRegistryVersion: null };
    }
    return { action: "reject", reason: "authority_bootstrap_required" };
  }
  if (current.authorityStateDigest === input.authorityStateDigest) {
    return {
      action: "reuse",
      registryVersion: current.registryVersion,
      supersedesRegistryVersion: current.supersedesRegistryVersion,
    };
  }
  if (rows.some((row) => row.authorityStateDigest === input.authorityStateDigest)) {
    return { action: "reject", reason: "authority_state_rollback" };
  }
  if (
    authorization?.change !== "authority_change"
    || authorization.authority_state_digest !== input.authorityStateDigest
  ) {
    return { action: "reject", reason: "authority_state_change_unapproved" };
  }
  if (authorization.supersedes_registry_version !== current.registryVersion) {
    return { action: "reject", reason: "stale_authority_approval" };
  }
  if (authorization.registry_version !== current.registryVersion + 1) {
    return { action: "reject", reason: "authority_approval_not_bound" };
  }
  return {
    action: "insert",
    registryVersion: authorization.registry_version,
    supersedesRegistryVersion: current.registryVersion,
  };
}

export function hashIssuerAuthorityChangeAuthorization(
  authorization: IssuerAuthorityChangeAuthorization,
): string {
  return createHash("sha256").update(canonicalizeJson(authorization), "utf8").digest("hex");
}

/**
 * Signs one proposal with an exportable private JWK.
 * Not an application route, not receipt issuance, and not protected custody.
 * A process that holds the private key can produce a valid signature.
 */
export function signIssuerAuthorityChangeAuthorization(input: {
  authorization: IssuerAuthorityChangeAuthorization;
  anchorPrivateJwk: JsonWebKey;
}): string {
  if (!input.anchorPrivateJwk.d) throw new Error("anchor_private_jwk_required");
  const hash = hashIssuerAuthorityChangeAuthorization(input.authorization);
  const seed = Buffer.from(input.anchorPrivateJwk.d, "base64url");
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const signature = nacl.sign.detached(Buffer.from(hash, "hex"), keyPair.secretKey);
  return Buffer.from(signature).toString("base64url");
}

export function verifyIssuerAuthorityChangeAuthorization(input: {
  authorization: IssuerAuthorityChangeAuthorization;
  signatureBase64Url: string;
  anchorPublicJwk: JsonWebKey;
}): { ok: true } | { ok: false; reason: string } {
  if (input.authorization.document !== ISSUER_AUTHORITY_CHANGE_DOCUMENT) {
    return { ok: false, reason: "authority_approval_document_invalid" };
  }
  const fingerprint = publicEd25519JwkFingerprint(input.anchorPublicJwk);
  if (!fingerprint || fingerprint !== input.authorization.anchor_fingerprint) {
    return { ok: false, reason: "authority_approval_anchor_mismatch" };
  }
  const hash = hashIssuerAuthorityChangeAuthorization(input.authorization);
  const ok = verifyEd25519Detached({
    message: Buffer.from(hash, "hex"),
    signatureBase64Url: input.signatureBase64Url,
    publicJwk: input.anchorPublicJwk,
  });
  return ok ? { ok: true } : { ok: false, reason: "authority_approval_signature_invalid" };
}

export type ResolvedIssuerAuthorityContinuity = {
  ok: true;
  registryVersion: number;
  supersedesRegistryVersion: number | null;
  authorityStateDigest: string;
  repeated: boolean;
};

function postgresCode(err: unknown): string | null {
  if (typeof err === "object" && err && "code" in err && typeof err.code === "string") return err.code;
  return null;
}

function readConfiguredIssuerAnchor(env: Record<string, string | undefined>):
  | { ok: true; anchorKeyId: string; anchorPublicJwk: JsonWebKey }
  | { ok: false; reason: string } {
  const anchorKeyId = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID?.trim();
  const raw = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK?.trim();
  if (!anchorKeyId || !raw) return { ok: false, reason: "authoritative_trust_anchor_unavailable" };
  try {
    return { ok: true, anchorKeyId, anchorPublicJwk: JSON.parse(raw) as JsonWebKey };
  } catch {
    return { ok: false, reason: "authoritative_trust_anchor_invalid" };
  }
}

export function describeConfiguredIssuerAuthority(input: {
  env?: Record<string, string | undefined>;
  anchorKeyId: string;
}):
  | { ok: true; environment: "demo" | "production"; authorityStateDigest: string }
  | { ok: false; reason: string } {
  const env = input.env ?? process.env;
  const state = loadIssuerAuthorityState(env);
  if (!state.ok) return state;
  return {
    ok: true,
    environment: state.environment,
    authorityStateDigest: issuerAuthorityStateDigest({
      environment: state.environment,
      anchor_key_id: input.anchorKeyId,
      keys: state.keys,
      status_signers: state.statusSigners,
    }),
  };
}

async function recordIssuerAuthorityContinuity(input: {
  env: Record<string, string | undefined>;
  anchorKeyId: string;
  authorization: IssuerAuthorityChangeAuthorization | null;
}): Promise<ResolvedIssuerAuthorityContinuity | { ok: false; reason: string }> {
  const described = describeConfiguredIssuerAuthority({
    env: input.env,
    anchorKeyId: input.anchorKeyId,
  });
  if (!described.ok) return described;
  if (input.authorization && input.authorization.environment !== described.environment) {
    return { ok: false, reason: "authority_approval_environment_mismatch" };
  }
  if (
    input.authorization
    && input.authorization.authority_state_digest !== described.authorityStateDigest
  ) {
    return { ok: false, reason: "authority_approval_digest_mismatch" };
  }

  const recorded = await withSovereignStagingPgTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1)::bigint)", [
      `issuer_authority_registry:${described.environment}`,
    ]);
    const existing = await client.query<{
      registry_version: number;
      authority_state_digest: string;
      supersedes_registry_version: number | null;
    }>(
      `select registry_version, authority_state_digest, supersedes_registry_version
         from public.issuer_authority_registry_continuity
        where environment = $1
        order by registry_version asc`,
      [described.environment],
    );
    const decision = decideIssuerAuthorityContinuity({
      rows: existing.rows.map((row) => ({
        registryVersion: row.registry_version,
        authorityStateDigest: row.authority_state_digest,
        supersedesRegistryVersion: row.supersedes_registry_version,
      })),
      authorityStateDigest: described.authorityStateDigest,
      authorization: input.authorization,
    });
    if (decision.action === "insert") {
      try {
        await client.query(
          `insert into public.issuer_authority_registry_continuity (
             environment, registry_version, authority_state_digest, anchor_key_id, supersedes_registry_version
           ) values ($1, $2, $3, $4, $5)`,
          [
            described.environment,
            decision.registryVersion,
            described.authorityStateDigest,
            input.anchorKeyId,
            decision.supersedesRegistryVersion,
          ],
        );
      } catch (err) {
        if (postgresCode(err) === "23505") {
          return { action: "reject" as const, reason: "authority_state_conflict" };
        }
        throw err;
      }
    }
    return decision;
  }, input.env);

  if (!recorded.ok) return { ok: false, reason: "authority_version_state_unavailable" };
  if (recorded.value.action === "reject") return { ok: false, reason: recorded.value.reason };
  return {
    ok: true,
    registryVersion: recorded.value.registryVersion,
    supersedesRegistryVersion: recorded.value.supersedesRegistryVersion,
    authorityStateDigest: described.authorityStateDigest,
    repeated: recorded.value.action === "reuse",
  };
}

/** Receipt issuance. Reuses a recorded authority version and cannot create one. */
export function resolveIssuerAuthorityRegistryContinuity(input: {
  env?: Record<string, string | undefined>;
  anchorKeyId: string;
}): Promise<ResolvedIssuerAuthorityContinuity | { ok: false; reason: string }> {
  return recordIssuerAuthorityContinuity({
    env: input.env ?? process.env,
    anchorKeyId: input.anchorKeyId,
    authorization: null,
  });
}

/**
 * Records a proposal whose signature matches the configured issuer public JWK.
 * The function does not accept a caller-supplied verification key. The key still
 * comes from application configuration, not from a relying party's pin.
 */
export async function applyIssuerAuthorityChangeAuthorization(input: {
  env?: Record<string, string | undefined>;
  authorization: IssuerAuthorityChangeAuthorization;
  signatureBase64Url: string;
}): Promise<ResolvedIssuerAuthorityContinuity | { ok: false; reason: string }> {
  const env = input.env ?? process.env;
  const pinned = readConfiguredIssuerAnchor(env);
  if (!pinned.ok) return pinned;
  if (input.authorization.anchor_key_id !== pinned.anchorKeyId) {
    return { ok: false, reason: "authority_approval_anchor_mismatch" };
  }
  const verified = verifyIssuerAuthorityChangeAuthorization({
    authorization: input.authorization,
    signatureBase64Url: input.signatureBase64Url,
    anchorPublicJwk: pinned.anchorPublicJwk,
  });
  if (!verified.ok) return verified;
  return recordIssuerAuthorityContinuity({
    env,
    anchorKeyId: pinned.anchorKeyId,
    authorization: input.authorization,
  });
}
