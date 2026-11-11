// Durable governance public pin on sovereign Postgres. Process restarts and additional
// application instances must resolve the same trusted fingerprint. The receipt runtime
// connection should not be granted insert on these tables; see migration 012.

import type { PoolClient } from "pg";
import { publicEd25519JwkFingerprint } from "@abraxas/independent-verifier";
import { withSovereignStagingPgTransaction } from "../sovereignStagingPg";
import {
  assertIndependentGovernancePin,
  verifyGovernanceSuccession,
  type GovernanceSuccessionAuthorization,
  type IndependentGovernancePin,
} from "./governanceApproval";
import {
  verifyGovernanceOperatorBootstrapWitness,
  verifyGovernanceTrustBootstrap,
  type GovernanceTrustBootstrapAuthorization,
} from "./governanceTrustBootstrap";

type AuthorityPublicKey = { key_id: string; public_jwk: JsonWebKey; status?: string };

type PinRow = {
  governance_key_id: string;
  public_jwk: JsonWebKey;
  public_key_fingerprint: string;
  operator_change_ticket: string;
  distrusted_at: Date | string | null;
};

function postgresCode(err: unknown): string | null {
  if (typeof err === "object" && err && "code" in err && typeof err.code === "string") return err.code;
  return null;
}

function pinFromRow(row: PinRow): {
  pin: IndependentGovernancePin;
  fingerprint: string;
  changeTicket: string;
  distrusted: boolean;
} {
  return {
    pin: { keyId: row.governance_key_id, publicJwk: row.public_jwk },
    fingerprint: row.public_key_fingerprint,
    changeTicket: row.operator_change_ticket,
    distrusted: row.distrusted_at != null,
  };
}

async function loadGovernanceTrustPinRow(
  client: PoolClient,
  environment: "demo" | "production",
): Promise<PinRow | null> {
  const loaded = await client.query<PinRow>(
    `select governance_key_id, public_jwk, public_key_fingerprint, operator_change_ticket, distrusted_at
       from public.issuer_governance_trust_pin
      where environment = $1`,
    [environment],
  );
  return loaded.rows[0] ?? null;
}

export async function readEstablishedGovernancePin(input: {
  env?: Record<string, string | undefined>;
  environment: "demo" | "production";
  client?: PoolClient;
}):
  Promise<
    | { ok: true; pin: IndependentGovernancePin; fingerprint: string; changeTicket: string }
    | { ok: false; reason: "governance_pin_not_established" | "governance_pin_unavailable" | "authority_version_state_unavailable" }
  > {
  const env = input.env ?? process.env;
  if (input.client) {
    const row = await loadGovernanceTrustPinRow(input.client, input.environment);
    if (!row) return { ok: false, reason: "governance_pin_not_established" };
    const parsed = pinFromRow(row);
    if (parsed.distrusted) return { ok: false, reason: "governance_pin_unavailable" };
    return { ok: true, pin: parsed.pin, fingerprint: parsed.fingerprint, changeTicket: parsed.changeTicket };
  }
  const loaded = await withSovereignStagingPgTransaction(async (client) => {
    return loadGovernanceTrustPinRow(client, input.environment);
  }, env);
  if (!loaded.ok) return { ok: false, reason: "authority_version_state_unavailable" };
  if (!loaded.value) return { ok: false, reason: "governance_pin_not_established" };
  const parsed = pinFromRow(loaded.value);
  if (parsed.distrusted) return { ok: false, reason: "governance_pin_unavailable" };
  return { ok: true, pin: parsed.pin, fingerprint: parsed.fingerprint, changeTicket: parsed.changeTicket };
}

export async function establishGovernanceTrustPin(input: {
  env?: Record<string, string | undefined>;
  environment: "demo" | "production";
  pin: IndependentGovernancePin;
  bootstrap: GovernanceTrustBootstrapAuthorization;
  bootstrapSignatureBase64Url: string;
  operatorWitnessSecret: string;
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  authorityKeys: AuthorityPublicKey[];
  statusSigners: AuthorityPublicKey[];
}):
  Promise<{ ok: true; fingerprint: string } | {
    ok: false;
    reason:
      | "governance_pin_change_ticket_required"
      | "governance_pin_already_established"
      | "governance_pin_distrusted_no_reinstall"
      | "governance_pin_invalid"
      | "governance_pin_not_independent"
      | "governance_bootstrap_document_invalid"
      | "governance_bootstrap_signature_invalid"
      | "governance_bootstrap_witness_required"
      | "governance_bootstrap_witness_invalid"
      | "governance_bootstrap_environment_mismatch"
      | "authority_version_state_unavailable"
      | "governance_pin_conflict";
  }> {
  const env = input.env ?? process.env;
  const changeTicket = input.bootstrap.operator_change_ticket.trim();
  if (!changeTicket) return { ok: false, reason: "governance_pin_change_ticket_required" };
  if (input.bootstrap.environment !== input.environment) {
    return { ok: false, reason: "governance_bootstrap_environment_mismatch" };
  }
  const witness = verifyGovernanceOperatorBootstrapWitness({
    witnessSecret: input.operatorWitnessSecret,
    env,
  });
  if (!witness.ok) return witness;
  const fingerprint = publicEd25519JwkFingerprint(input.pin.publicJwk);
  if (!fingerprint) return { ok: false, reason: "governance_pin_invalid" };
  const independent = assertIndependentGovernancePin({
    pin: input.pin,
    anchorKeyId: input.anchorKeyId,
    anchorPublicJwk: input.anchorPublicJwk,
    authorityKeys: input.authorityKeys,
    statusSigners: input.statusSigners,
  });
  if (!independent.ok) return independent;
  const bootstrap = verifyGovernanceTrustBootstrap({
    authorization: input.bootstrap,
    signatureBase64Url: input.bootstrapSignatureBase64Url,
    governancePublicJwk: input.pin.publicJwk,
    governanceKeyId: input.pin.keyId,
    publicKeyFingerprint: fingerprint,
  });
  if (!bootstrap.ok) return bootstrap;

  const recorded = await withSovereignStagingPgTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1)::bigint)", [
      `issuer_governance_trust:${input.environment}`,
    ]);
    const existing = await loadGovernanceTrustPinRow(client, input.environment);
    if (existing) {
      if (existing.distrusted_at != null) {
        return { action: "reject" as const, reason: "governance_pin_distrusted_no_reinstall" as const };
      }
      return { action: "reject" as const, reason: "governance_pin_already_established" as const };
    }
    try {
      await client.query(
        `insert into public.issuer_governance_trust_pin (
           environment, governance_key_id, public_jwk, public_key_fingerprint, operator_change_ticket
         ) values ($1, $2, $3::jsonb, $4, $5)`,
        [input.environment, input.pin.keyId, JSON.stringify(input.pin.publicJwk), fingerprint, changeTicket],
      );
      await client.query(
        `insert into public.issuer_governance_trust_events (
           environment, event_type, governance_key_id, public_key_fingerprint, operator_change_ticket, detail
         ) values ($1, 'bootstrap', $2, $3, $4, $5::jsonb)`,
        [
          input.environment,
          input.pin.keyId,
          fingerprint,
          changeTicket,
          JSON.stringify({ operator_attested_at: input.bootstrap.operator_attested_at }),
        ],
      );
    } catch (err) {
      if (postgresCode(err) === "23505") {
        return { action: "reject" as const, reason: "governance_pin_conflict" as const };
      }
      throw err;
    }
    return { action: "insert" as const, fingerprint };
  }, env);
  if (!recorded.ok) return { ok: false, reason: "authority_version_state_unavailable" };
  if (recorded.value.action === "reject") return { ok: false, reason: recorded.value.reason };
  return { ok: true, fingerprint: recorded.value.fingerprint };
}

export async function rotateEstablishedGovernancePin(input: {
  env?: Record<string, string | undefined>;
  environment: "demo" | "production";
  succession: GovernanceSuccessionAuthorization;
  signatureBase64Url: string;
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  authorityKeys: AuthorityPublicKey[];
  statusSigners: AuthorityPublicKey[];
}): Promise<{ ok: true; fingerprint: string } | { ok: false; reason: string }> {
  const env = input.env ?? process.env;
  const recorded = await withSovereignStagingPgTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1)::bigint)", [
      `issuer_governance_trust:${input.environment}`,
    ]);
    const row = await loadGovernanceTrustPinRow(client, input.environment);
    if (!row) return { action: "reject" as const, reason: "governance_pin_not_established" };
    if (row.distrusted_at != null) return { action: "reject" as const, reason: "governance_pin_unavailable" };
    const current = pinFromRow(row);
    const verified = verifyGovernanceSuccession({
      succession: input.succession,
      signatureBase64Url: input.signatureBase64Url,
      currentPin: current.pin,
      anchorKeyId: input.anchorKeyId,
      anchorPublicJwk: input.anchorPublicJwk,
      authorityKeys: input.authorityKeys,
      statusSigners: input.statusSigners,
    });
    if (!verified.ok) return { action: "reject" as const, reason: verified.reason };
    const fingerprint = publicEd25519JwkFingerprint(verified.successor.publicJwk);
    if (!fingerprint) return { action: "reject" as const, reason: "governance_pin_invalid" };
    if (fingerprint === current.fingerprint) {
      return { action: "reject" as const, reason: "governance_pin_not_independent" };
    }
    await client.query(
      `update public.issuer_governance_trust_pin
          set governance_key_id = $2,
              public_jwk = $3::jsonb,
              public_key_fingerprint = $4,
              distrusted_at = null,
              distrust_reason = null
        where environment = $1
          and public_key_fingerprint = $5
          and distrusted_at is null`,
      [
        input.environment,
        verified.successor.keyId,
        JSON.stringify(verified.successor.publicJwk),
        fingerprint,
        current.fingerprint,
      ],
    );
    await client.query(
      `insert into public.issuer_governance_trust_events (
         environment, event_type, governance_key_id, public_key_fingerprint, operator_change_ticket, detail
       ) values ($1, 'succession', $2, $3, $4, $5::jsonb)`,
      [
        input.environment,
        verified.successor.keyId,
        fingerprint,
        row.operator_change_ticket,
        JSON.stringify({
          supersedes_fingerprint: current.fingerprint,
          current_governance_key_id: input.succession.current_governance_key_id,
        }),
      ],
    );
    return { action: "rotate" as const, fingerprint };
  }, env);
  if (!recorded.ok) return { ok: false, reason: "authority_version_state_unavailable" };
  if (recorded.value.action === "reject") return { ok: false, reason: recorded.value.reason };
  return { ok: true, fingerprint: recorded.value.fingerprint };
}

export async function distrustEstablishedGovernancePin(input: {
  env?: Record<string, string | undefined>;
  environment: "demo" | "production";
  fingerprint: string;
  reason: string;
}):
  Promise<
    | { ok: true }
    | {
        ok: false;
        reason:
          | "governance_pin_not_established"
          | "governance_pin_fingerprint_mismatch"
          | "governance_pin_unavailable"
          | "authority_version_state_unavailable";
      }
  > {
  const env = input.env ?? process.env;
  const trimmed = input.reason.trim();
  if (!trimmed) return { ok: false, reason: "governance_pin_fingerprint_mismatch" };
  const recorded = await withSovereignStagingPgTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1)::bigint)", [
      `issuer_governance_trust:${input.environment}`,
    ]);
    const row = await loadGovernanceTrustPinRow(client, input.environment);
    if (!row) return { action: "reject" as const, reason: "governance_pin_not_established" as const };
    if (row.distrusted_at != null) return { action: "reject" as const, reason: "governance_pin_unavailable" as const };
    if (row.public_key_fingerprint !== input.fingerprint) {
      return { action: "reject" as const, reason: "governance_pin_fingerprint_mismatch" as const };
    }
    await client.query(
      `update public.issuer_governance_trust_pin
          set distrusted_at = now(), distrust_reason = $2
        where environment = $1
          and public_key_fingerprint = $3
          and distrusted_at is null`,
      [input.environment, trimmed, input.fingerprint],
    );
    await client.query(
      `insert into public.issuer_governance_trust_events (
         environment, event_type, governance_key_id, public_key_fingerprint, operator_change_ticket, detail
       ) values ($1, 'distrust', $2, $3, $4, $5::jsonb)`,
      [input.environment, row.governance_key_id, row.public_key_fingerprint, row.operator_change_ticket, JSON.stringify({ reason: trimmed })],
    );
    return { action: "distrust" as const };
  }, env);
  if (!recorded.ok) return { ok: false, reason: "authority_version_state_unavailable" };
  if (recorded.value.action === "reject") return { ok: false, reason: recorded.value.reason };
  return { ok: true };
}

/** Disposable proofs only. Not for receipt issuance runtimes. */
export async function clearGovernanceTrustPinForTests(input: {
  env?: Record<string, string | undefined>;
  environment: "demo" | "production";
}): Promise<void> {
  if (input.env?.ABRAXAS_SOVEREIGN_ENV_CLASS !== "disposable" && process.env.ABRAXAS_SOVEREIGN_ENV_CLASS !== "disposable") {
    throw new Error("governance_test_clear_forbidden");
  }
  const env = input.env ?? process.env;
  const cleared = await withSovereignStagingPgTransaction(async (client) => {
    await client.query(`delete from public.issuer_governance_trust_events where environment = $1`, [input.environment]);
    await client.query(`delete from public.issuer_governance_trust_pin where environment = $1`, [input.environment]);
  }, env);
  if (!cleared.ok) throw new Error(cleared.error);
}
