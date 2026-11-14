import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertInstitutionalWorkerProcessEnv,
  assertReceiptRuntimeMustNotHoldInstitutionalCustody,
} from "./runtimeGuards";
import { INSTITUTIONAL_WORKER_ENV_FLAG } from "../custodyImplementation";
import { bootstrapInstitutionalSigningWorker } from "./workerBootstrap";
import { createInstitutionalSigningHttpServer, getServerAddress } from "./httpServer";
import { loadWorkerCredentialRegistry, WORKER_CALLER_STATUS_SCOPE_ENV } from "./workerCredentialRegistry";
import { validateInstitutionalWorkerStartup } from "./workerStartup";
import { assertWorkerListenHostAllowed } from "./transportValidation";
import type { Server } from "node:http";

const CALLER_SECRETS = {
  status: "test-caller-status-secret",
  issuer: "test-caller-issuer-secret",
  authority: "test-caller-authority-secret",
  health: "test-caller-health-secret",
} as const;

function workerCallerEnv(extra: Record<string, string | undefined> = {}) {
  return {
    ABRAXAS_WORKER_CALLER_STATUS_SECRET: CALLER_SECRETS.status,
    ABRAXAS_WORKER_CALLER_ISSUER_SECRET: CALLER_SECRETS.issuer,
    ABRAXAS_WORKER_CALLER_AUTHORITY_SECRET: CALLER_SECRETS.authority,
    ABRAXAS_WORKER_CALLER_HEALTH_SECRET: CALLER_SECRETS.health,
    [WORKER_CALLER_STATUS_SCOPE_ENV]: "institution_wide",
    ...extra,
  };
}

describe("institutional signing worker isolation", () => {
  it("refuses worker bootstrap on simulated Vercel", () => {
    expect(
      assertInstitutionalWorkerProcessEnv({
        [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
        VERCEL: "1",
        VERCEL_ENV: undefined,
      }),
    ).toEqual({ ok: false, reason: "vercel_worker_forbidden" });
  });

  it("refuses institutional custody credentials on simulated Vercel receipt runtime", () => {
    expect(
      assertReceiptRuntimeMustNotHoldInstitutionalCustody({
        VERCEL: "1",
        ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID: "AKIA",
      }),
    ).toEqual({ ok: false, reason: "institutional_custody_credentials_on_receipt_runtime" });
  });

  it("rejects universal bearer configuration", () => {
    expect(
      loadWorkerCredentialRegistry({
        env: {
          ABRAXAS_INSTITUTIONAL_WORKER_BEARER_TOKEN: "shared",
          ABRAXAS_WORKER_CALLER_STATUS_SECRET: CALLER_SECRETS.status,
          ABRAXAS_WORKER_CALLER_ISSUER_SECRET: CALLER_SECRETS.issuer,
          ABRAXAS_WORKER_CALLER_AUTHORITY_SECRET: CALLER_SECRETS.authority,
          ABRAXAS_WORKER_CALLER_HEALTH_SECRET: CALLER_SECRETS.health,
        },
        workerEnvironment: "demo",
      }).ok,
    ).toBe(false);
  });

  it("rejects duplicate caller secrets", () => {
    expect(
      loadWorkerCredentialRegistry({
        env: {
          ...workerCallerEnv({
            ABRAXAS_WORKER_CALLER_STATUS_SECRET: "same-secret",
            ABRAXAS_WORKER_CALLER_ISSUER_SECRET: "same-secret",
          }),
        },
        workerEnvironment: "demo",
      }).ok,
    ).toBe(false);
  });

  it("rejects status caller without explicit resource scope", () => {
    expect(
      loadWorkerCredentialRegistry({
        env: workerCallerEnv({ [WORKER_CALLER_STATUS_SCOPE_ENV]: undefined }),
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_status_scope_required" });
  });

  it("rejects production status caller without explicit resource scope", () => {
    expect(
      loadWorkerCredentialRegistry({
        env: workerCallerEnv({ [WORKER_CALLER_STATUS_SCOPE_ENV]: undefined }),
        workerEnvironment: "production",
      }),
    ).toEqual({ ok: false, reason: "worker_status_scope_required_in_production" });
  });

  it("rejects partner-scoped status caller without partner binding", () => {
    expect(
      loadWorkerCredentialRegistry({
        env: workerCallerEnv({ [WORKER_CALLER_STATUS_SCOPE_ENV]: "partner" }),
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_status_partner_scope_unbound" });
  });

  it("rejects institution-wide status caller with partner env binding", () => {
    expect(
      loadWorkerCredentialRegistry({
        env: workerCallerEnv({
          [WORKER_CALLER_STATUS_SCOPE_ENV]: "institution_wide",
          ABRAXAS_WORKER_CALLER_STATUS_PARTNER_ID: "partner-a",
        }),
        workerEnvironment: "demo",
      }),
    ).toEqual({ ok: false, reason: "worker_status_institution_scope_partner_forbidden" });
  });

  it("rejects non-loopback bind in demo even when TLS paths are set", () => {
    expect(
      assertWorkerListenHostAllowed("0.0.0.0", {
        ABRAXAS_INSTITUTIONAL_WORKER_TLS_KEY_PATH: "/tmp/key.pem",
        ABRAXAS_INSTITUTIONAL_WORKER_TLS_CERT_PATH: "/tmp/cert.pem",
      }, "demo"),
    ).toEqual({ ok: false, reason: "worker_loopback_bind_required" });
    expect(
      validateInstitutionalWorkerStartup({
        env: {
          [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
          ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT: "demo",
          ...workerCallerEnv(),
          ABRAXAS_INSTITUTIONAL_WORKER_TLS_KEY_PATH: "/tmp/key.pem",
          ABRAXAS_INSTITUTIONAL_WORKER_TLS_CERT_PATH: "/tmp/cert.pem",
        },
        listenHost: "0.0.0.0",
      }),
    ).toEqual({ ok: false, reason: "worker_loopback_bind_required" });
  });

  it("rejects non-loopback bind in production", () => {
    expect(
      assertWorkerListenHostAllowed("192.168.0.5", {}, "production"),
    ).toEqual({ ok: false, reason: "worker_loopback_bind_required" });
  });

  it("rejects unsafe direct HTTP server construction on public bind", () => {
    expect(() =>
      createInstitutionalSigningHttpServer({
        workerEnvironment: "demo",
        listenHost: "127.0.0.1",
        loopbackOnly: true,
        registry: { bySecretDigest: new Map(), principals: [] },
        verifyBearer: () => null,
        host: "0.0.0.0",
        port: 0,
        handlers: {
          surface: "demo-memory",
          opened: {} as never,
          env: {},
        },
      }),
    ).toThrow("worker_loopback_bind_required");
  });

  it("rejects production demo-memory startup", () => {
    expect(
      validateInstitutionalWorkerStartup({
        env: {
          [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
          ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT: "production",
          ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY: "1",
          ...workerCallerEnv(),
        },
        listenHost: "127.0.0.1",
      }).ok,
    ).toBe(false);
  });
});

describe("institutional signing worker HTTP boundary", () => {
  const previousEnv: Record<string, string | undefined> = {};
  let server: Server;
  let baseUrl = "";
  let verifyBearer: (token: string) => import("./workerScopes").WorkerPrincipal | null;

  function applyTestEnv() {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.ABRAXAS_INSTITUTIONAL_WORKER_BEARER_TOKEN;
    delete process.env.ABRAXAS_GOVERNANCE_OPERATOR_PG_URL;
    process.env[INSTITUTIONAL_WORKER_ENV_FLAG] = "1";
    process.env.ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT = "demo";
    process.env.ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY = "1";
    process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID = "worker-test-anchor";
    process.env.ABRAXAS_STATUS_SIGNER_KEY_ID = "worker-test-status";
    for (const [key, value] of Object.entries(workerCallerEnv())) {
      process.env[key] = value;
    }
  }

  beforeAll(async () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_INSTITUTIONAL") || key.startsWith("ABRAXAS_WORKER")) {
        previousEnv[key] = process.env[key];
      }
    }
    applyTestEnv();
    const startup = validateInstitutionalWorkerStartup({ env: process.env, listenHost: "127.0.0.1" });
    expect(startup.ok).toBe(true);
    if (!startup.ok) return;
    const credentials = loadWorkerCredentialRegistry({
      env: process.env,
      workerEnvironment: startup.workerEnvironment,
    });
    expect(credentials.ok).toBe(true);
    if (!credentials.ok) return;
    verifyBearer = credentials.verifyBearer;
    const boot = await bootstrapInstitutionalSigningWorker(process.env);
    expect(boot.ok).toBe(true);
    if (!boot.ok) return;
    server = createInstitutionalSigningHttpServer({
      workerEnvironment: startup.workerEnvironment,
      listenHost: "127.0.0.1",
      loopbackOnly: true,
      registry: credentials.registry,
      verifyBearer: credentials.verifyBearer,
      host: "127.0.0.1",
      port: 0,
      handlers: { surface: boot.surface, opened: boot.opened, env: boot.env },
    });
    const address = await getServerAddress(server);
    baseUrl = `http://${address.host}:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  async function post(path: string, body: unknown, secret?: string, method = "POST") {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
        "x-role": "admin",
        "x-scope": "institutional:*",
      },
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });
  }

  it("returns 401 without authentication", async () => {
    const res = await post("/v1/health", {}, undefined);
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid authentication", async () => {
    const res = await post("/v1/health", {}, "wrong-secret");
    expect(res.status).toBe(401);
  });

  it("forbids arbitrary digest route with 403", async () => {
    const res = await post("/v1/signRawDigest", { message: "00" }, CALLER_SECRETS.status);
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await post("/v1/unknown", {}, CALLER_SECRETS.health);
    expect(res.status).toBe(404);
  });

  it("returns 405 with Allow POST for unsupported methods", async () => {
    const res = await post("/v1/health", {}, CALLER_SECRETS.health, "GET");
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("forbids cross-role scope: status credential on issuer route", async () => {
    const res = await post("/v1/authoritative/recorded-issuer-authority-statement", {}, CALLER_SECRETS.status);
    expect(res.status).toBe(403);
  });

  it("forbids cross-role scope: issuer credential on status route", async () => {
    const res = await post("/v1/authoritative/receipt-status", {}, CALLER_SECRETS.issuer);
    expect(res.status).toBe(403);
  });

  it("forbids cross-role scope: issuer credential on authority route", async () => {
    const res = await post("/v1/authoritative/authority-change-approval", {}, CALLER_SECRETS.issuer);
    expect(res.status).toBe(403);
  });

  it("forbids health credential on signing routes", async () => {
    const res = await post("/v1/authoritative/receipt-status", {}, CALLER_SECRETS.health);
    expect(res.status).toBe(403);
  });

  it("rejects wrong environment in request body", async () => {
    const res = await post("/v1/health", { environment: "production" }, CALLER_SECRETS.health);
    expect(res.status).toBe(200);
    const issuer = await post(
      "/v1/authoritative/recorded-issuer-authority-statement",
      { environment: "production" },
      CALLER_SECRETS.issuer,
    );
    expect(issuer.status).toBe(403);
  });

  it("returns minimal health without signing identities", async () => {
    const res = await post("/v1/health", {}, CALLER_SECRETS.health);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, status: "ready" });
    expect(JSON.stringify(json)).not.toContain("identity");
  });

  it("ignores caller-supplied role headers", async () => {
    const res = await post("/v1/authoritative/recorded-issuer-authority-statement", {}, CALLER_SECRETS.status);
    expect(res.status).toBe(403);
  });

  it("rejects expired credentials", async () => {
    const credentials = loadWorkerCredentialRegistry({
      env: {
        ...process.env,
        ...workerCallerEnv({
          ABRAXAS_WORKER_CALLER_HEALTH_SECRET: "expired-health",
          ABRAXAS_WORKER_CALLER_HEALTH_NOT_AFTER: "2020-01-01T00:00:00.000Z",
        }),
      },
      workerEnvironment: "demo",
    });
    expect(credentials.ok).toBe(true);
    if (!credentials.ok) return;
    expect(credentials.verifyBearer("expired-health")).toBeNull();
  });

  it("authority-change without governance approval fails closed", async () => {
    const res = await post(
      "/v1/authoritative/authority-change-approval",
      { assertedAuthorityStateDigest: "ab".repeat(32) },
      CALLER_SECRETS.authority,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("authorized health succeeds on loopback", async () => {
    expect(verifyBearer(CALLER_SECRETS.health)?.scopes).toEqual(["institutional:health:read"]);
    const res = await post("/v1/health", {}, CALLER_SECRETS.health);
    expect(res.status).toBe(200);
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const res = await fetch(`${baseUrl}/v1/health`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${CALLER_SECRETS.health}`,
      },
      body: "{not-json",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ ok: false, reason: "invalid_json" });
  });
});
