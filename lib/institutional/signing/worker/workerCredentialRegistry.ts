import { createHash, timingSafeEqual } from "node:crypto";
import type { WorkerPrincipal, WorkerScope } from "./workerScopes";

export type WorkerCredentialRegistry = {
  bySecretDigest: Map<string, WorkerPrincipal>;
  principals: WorkerPrincipal[];
};

function digestSecret(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function parseNotAfter(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function loadPrincipal(input: {
  env: Record<string, string | undefined>;
  prefix: string;
  identityId: string;
  scope: WorkerScope;
  workerEnvironment: "demo" | "production";
}): { ok: true; principal: WorkerPrincipal; secretDigest: Buffer } | { ok: false; reason: string } {
  const secret = input.env[`ABRAXAS_WORKER_CALLER_${input.prefix}_SECRET`]?.trim() ?? "";
  if (!secret) return { ok: false, reason: `worker_caller_${input.prefix.toLowerCase()}_secret_missing` };
  const notAfter = parseNotAfter(input.env[`ABRAXAS_WORKER_CALLER_${input.prefix}_NOT_AFTER`]);
  if (notAfter && Number.isNaN(Date.parse(notAfter))) {
    return { ok: false, reason: `worker_caller_${input.prefix.toLowerCase()}_not_after_invalid` };
  }
  const principal: WorkerPrincipal = {
    identityId: input.env[`ABRAXAS_WORKER_CALLER_${input.prefix}_ID`]?.trim() || `${input.prefix.toLowerCase()}-caller`,
    environment: input.workerEnvironment,
    scopes: [input.scope],
    partnerId: input.env[`ABRAXAS_WORKER_CALLER_${input.prefix}_PARTNER_ID`]?.trim() || undefined,
    tenantId: input.env[`ABRAXAS_WORKER_CALLER_${input.prefix}_TENANT_ID`]?.trim() || undefined,
    notAfter,
  };
  return { ok: true, principal, secretDigest: digestSecret(secret) };
}

export function loadWorkerCredentialRegistry(input: {
  env: Record<string, string | undefined>;
  workerEnvironment: "demo" | "production";
}):
  | { ok: true; registry: WorkerCredentialRegistry; verifyBearer: (token: string) => WorkerPrincipal | null }
  | { ok: false; reason: string } {
  if (input.env.ABRAXAS_INSTITUTIONAL_WORKER_BEARER_TOKEN?.trim()) {
    return { ok: false, reason: "worker_universal_bearer_forbidden" };
  }

  const entries = [
    loadPrincipal({ env: input.env, prefix: "STATUS", identityId: "status", scope: "institutional:status:publish", workerEnvironment: input.workerEnvironment }),
    loadPrincipal({ env: input.env, prefix: "ISSUER", identityId: "issuer", scope: "institutional:issuer:publish", workerEnvironment: input.workerEnvironment }),
    loadPrincipal({ env: input.env, prefix: "AUTHORITY", identityId: "authority", scope: "institutional:authority:change", workerEnvironment: input.workerEnvironment }),
    loadPrincipal({ env: input.env, prefix: "HEALTH", identityId: "health", scope: "institutional:health:read", workerEnvironment: input.workerEnvironment }),
  ];

  const bySecretDigest = new Map<string, WorkerPrincipal>();
  const principals: WorkerPrincipal[] = [];
  const seenDigests = new Set<string>();

  for (const entry of entries) {
    if (!entry.ok) return entry;
    const digestKey = entry.secretDigest.toString("hex");
    if (seenDigests.has(digestKey)) {
      return { ok: false, reason: "worker_shared_caller_credential_forbidden" };
    }
    seenDigests.add(digestKey);
    bySecretDigest.set(digestKey, entry.principal);
    principals.push(entry.principal);
  }

  const secrets = [
    input.env.ABRAXAS_WORKER_CALLER_STATUS_SECRET?.trim() ?? "",
    input.env.ABRAXAS_WORKER_CALLER_ISSUER_SECRET?.trim() ?? "",
    input.env.ABRAXAS_WORKER_CALLER_AUTHORITY_SECRET?.trim() ?? "",
    input.env.ABRAXAS_WORKER_CALLER_HEALTH_SECRET?.trim() ?? "",
  ];

  function verifyBearer(token: string): WorkerPrincipal | null {
    if (!token) return null;
    const digest = digestSecret(token);
    const digestKey = digest.toString("hex");
    const principal = bySecretDigest.get(digestKey);
    if (!principal) {
      // Constant-time negative comparison against configured secrets.
      for (const secret of secrets) {
        if (!secret) continue;
        const expected = digestSecret(secret);
        if (expected.length === digest.length) timingSafeEqual(expected, digest);
      }
      return null;
    }
    if (principal.notAfter && Date.parse(principal.notAfter) <= Date.now()) return null;
    return principal;
  }

  return {
    ok: true,
    registry: { bySecretDigest, principals },
    verifyBearer,
  };
}
