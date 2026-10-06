// FILE: lib/identity/providerIngestion/authenticate.ts
// Authenticate inbound provider events — separate from partner API keys.

import { createHmac, timingSafeEqual } from "crypto";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import { resolveCanonicalIssuer } from "@/lib/trust/resolveCanonicalIssuer";
import type { NormalizedProviderEvent } from "./contract";

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;
const PARTNER_KEY_PREFIXES = ["abx_test_", "abx_live_"];

export type ProviderAuthResult =
  | { ok: true; providerId: string }
  | { ok: false; code: string; detail?: string };

function resolveIngestSecret(providerId: string, metadata: Record<string, unknown>): string | null {
  const ingestAuth = metadata.ingest_auth as Record<string, unknown> | undefined;
  const envKey = ingestAuth?.secret_env as string | undefined;
  if (envKey) {
    const fromEnv = process.env[envKey]?.trim();
    if (fromEnv) return fromEnv;
  }

  const direct = process.env[`PROVIDER_INGEST_SECRET_${providerId.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`]?.trim();
  if (direct) return direct;

  if (process.env.NODE_ENV === "test" || process.env.VERCEL_ENV === "preview") {
    return process.env.PROVIDER_INGEST_TEST_SECRET ?? "provider-ingest-test-secret-do-not-use-in-production";
  }

  return null;
}

export function isPartnerApiKeyAttempt(rawKey: string | null): boolean {
  if (!rawKey) return false;
  return PARTNER_KEY_PREFIXES.some((p) => rawKey.startsWith(p));
}

export async function authenticateProviderEvent(input: {
  rawBody: string;
  providerId: string;
  signature: string | null;
  timestamp: string | null;
  apiKeyHeader: string | null;
}): Promise<ProviderAuthResult> {
  if (isPartnerApiKeyAttempt(input.apiKeyHeader)) {
    return { ok: false, code: "partner_key_not_provider_auth" };
  }

  if (!input.providerId?.trim()) {
    return { ok: false, code: "provider_id_required" };
  }
  if (!input.signature?.trim()) {
    return { ok: false, code: "signature_required" };
  }
  if (!input.timestamp?.trim()) {
    return { ok: false, code: "timestamp_required" };
  }

  const ts = Date.parse(input.timestamp);
  if (Number.isNaN(ts)) {
    return { ok: false, code: "timestamp_invalid" };
  }
  if (Math.abs(Date.now() - ts) > MAX_TIMESTAMP_SKEW_MS) {
    return { ok: false, code: "timestamp_stale" };
  }

  const issuer = await resolveCanonicalIssuer(input.providerId);
  if (!issuer) {
    return { ok: false, code: "provider_unknown" };
  }
  if (issuer.issuer_status !== "active") {
    return { ok: false, code: "provider_revoked" };
  }

  const secret = resolveIngestSecret(input.providerId, issuer.metadata ?? {});
  if (!secret) {
    return { ok: false, code: "provider_ingest_secret_missing" };
  }

  const message = `${input.timestamp}.${input.rawBody}`;
  const expected = createHmac("sha256", secret).update(message, "utf8").digest("hex");
  const provided = input.signature.replace(/^sha256=/, "").trim();

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, code: "signature_invalid" };
    }
  } catch {
    return { ok: false, code: "signature_invalid" };
  }

  return { ok: true, providerId: input.providerId };
}

export function parseProviderEventBody(rawBody: string): NormalizedProviderEvent | null {
  try {
    const parsed = JSON.parse(rawBody) as NormalizedProviderEvent;
    if (!parsed?.provider_id || !parsed?.provider_event_id || !parsed?.provider_subject_ref) {
      return null;
    }
    if (!parsed.event_type || !parsed.issued_at) return null;
    if (!Array.isArray(parsed.authorized_assertions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function validateEventEnvelope(event: NormalizedProviderEvent): string | null {
  if (event.schema_version && event.schema_version !== "1.0.0") {
    return "unsupported_schema_version";
  }
  if (event.provider_id !== event.provider_id.trim()) {
    return "invalid_provider_id";
  }
  const issuedAt = Date.parse(event.issued_at);
  if (Number.isNaN(issuedAt)) return "issued_at_invalid";
  if (issuedAt > Date.now() + MAX_TIMESTAMP_SKEW_MS) return "issued_at_future";
  if (event.expires_at) {
    const expiresAt = Date.parse(event.expires_at);
    if (Number.isNaN(expiresAt)) return "expires_at_invalid";
    if (expiresAt < Date.now()) return "event_expired";
  }
  if (event.authorized_assertions.length === 0 && event.event_type === "verification_completed") {
    return "assertions_required";
  }
  return null;
}

/** Strip dangerous raw fields before any persistence. */
export function stripRawProviderFields(body: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...body };
  for (const key of Object.keys(clean)) {
    if (key.startsWith("raw_") || key.includes("legal_name") || key.includes("passport")) {
      delete clean[key];
    }
  }
  return clean;
}

export function canonicalEventHash(event: NormalizedProviderEvent): string {
  return canonicalizeJson({
    provider_id: event.provider_id,
    provider_event_id: event.provider_event_id,
    event_type: event.event_type,
    issued_at: event.issued_at,
    assertions: event.authorized_assertions.map((a) => ({
      claim_type: a.claim_type,
      assurance_level: a.assurance_level,
    })),
  });
}
