// FILE: lib/persistence/boundary/issuerAuthority/registryContinuity.ts
// Authority-state versions. Signing another receipt does not advance the version.

import { issuerAuthorityStateDigest } from "@abraxas/independent-verifier";
import { loadIssuerAuthorityState } from "./buildFromRegistry";
import { withSovereignStagingPgTransaction } from "../sovereignStagingPg";

export const INITIAL_ISSUER_REGISTRY_VERSION = 854;

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
  authorityChangeApproved: boolean;
  initialVersion?: number;
}): IssuerRegistryContinuityDecision {
  const initial = input.initialVersion ?? INITIAL_ISSUER_REGISTRY_VERSION;
  const rows = [...input.rows].sort((left, right) => left.registryVersion - right.registryVersion);
  const current = rows.at(-1);
  if (!current) {
    return { action: "insert", registryVersion: initial, supersedesRegistryVersion: null };
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
  if (!input.authorityChangeApproved) {
    return { action: "reject", reason: "authority_state_change_unapproved" };
  }
  return {
    action: "insert",
    registryVersion: current.registryVersion + 1,
    supersedesRegistryVersion: current.registryVersion,
  };
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

async function recordIssuerAuthorityContinuity(input: {
  env: Record<string, string | undefined>;
  anchorKeyId: string;
  authorityChangeApproved: boolean;
}): Promise<ResolvedIssuerAuthorityContinuity | { ok: false; reason: string }> {
  const state = loadIssuerAuthorityState(input.env);
  if (!state.ok) return state;
  const authorityStateDigest = issuerAuthorityStateDigest({
    environment: state.environment,
    anchor_key_id: input.anchorKeyId,
    keys: state.keys,
    status_signers: state.statusSigners,
  });

  const recorded = await withSovereignStagingPgTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1)::bigint)", [
      `issuer_authority_registry:${state.environment}`,
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
      [state.environment],
    );
    const decision = decideIssuerAuthorityContinuity({
      rows: existing.rows.map((row) => ({
        registryVersion: row.registry_version,
        authorityStateDigest: row.authority_state_digest,
        supersedesRegistryVersion: row.supersedes_registry_version,
      })),
      authorityStateDigest,
      authorityChangeApproved: input.authorityChangeApproved,
    });
    if (decision.action === "insert") {
      try {
        await client.query(
          `insert into public.issuer_authority_registry_continuity (
             environment, registry_version, authority_state_digest, anchor_key_id, supersedes_registry_version
           ) values ($1, $2, $3, $4, $5)`,
          [
            state.environment,
            decision.registryVersion,
            authorityStateDigest,
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
    authorityStateDigest,
    repeated: recorded.value.action === "reuse",
  };
}

/** Receipt issuance. Reuses the current authority version and rejects an unapproved change. */
export function resolveIssuerAuthorityRegistryContinuity(input: {
  env?: Record<string, string | undefined>;
  anchorKeyId: string;
}): Promise<ResolvedIssuerAuthorityContinuity | { ok: false; reason: string }> {
  return recordIssuerAuthorityContinuity({
    env: input.env ?? process.env,
    anchorKeyId: input.anchorKeyId,
    authorityChangeApproved: false,
  });
}

/** Explicit authority change: key addition, rotation, revocation, or another registry modification. */
export function approveIssuerAuthorityStateChange(input: {
  env?: Record<string, string | undefined>;
  anchorKeyId: string;
}): Promise<ResolvedIssuerAuthorityContinuity | { ok: false; reason: string }> {
  return recordIssuerAuthorityContinuity({
    env: input.env ?? process.env,
    anchorKeyId: input.anchorKeyId,
    authorityChangeApproved: true,
  });
}
