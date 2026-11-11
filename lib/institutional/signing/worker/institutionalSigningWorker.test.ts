import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertInstitutionalWorkerProcessEnv,
  assertReceiptRuntimeMustNotHoldInstitutionalCustody,
  INSTITUTIONAL_WORKER_ENV_FLAG,
} from "./runtimeGuards";
import { bootstrapInstitutionalSigningWorker } from "./workerBootstrap";
import { createInstitutionalSigningHttpServer, getServerAddress } from "./httpServer";
import type { Server } from "node:http";

describe("institutional signing worker isolation", () => {
  it("refuses worker bootstrap on simulated Vercel", async () => {
    expect(
      assertInstitutionalWorkerProcessEnv({
        [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
        VERCEL: "1",
      }),
    ).toEqual({ ok: false, reason: "vercel_worker_forbidden" });
  });

  it("refuses governance operator URL on worker", () => {
    expect(
      assertInstitutionalWorkerProcessEnv({
        [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
        ABRAXAS_GOVERNANCE_OPERATOR_PG_URL: "postgres://operator",
      }),
    ).toEqual({ ok: false, reason: "governance_operator_url_forbidden_on_worker" });
  });

  it("refuses institutional custody credentials on simulated Vercel receipt runtime", () => {
    expect(
      assertReceiptRuntimeMustNotHoldInstitutionalCustody({
        VERCEL: "1",
        ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID: "AKIA",
      }),
    ).toEqual({ ok: false, reason: "institutional_custody_credentials_on_receipt_runtime" });
  });
});

describe("institutional signing worker HTTP boundary", () => {
  const token = "test-worker-bearer-token";
  let server: Server;
  let baseUrl = "";
  const previousEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const key of [
      INSTITUTIONAL_WORKER_ENV_FLAG,
      "ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT",
      "ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY",
      "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID",
      "ABRAXAS_STATUS_SIGNER_KEY_ID",
    ]) {
      previousEnv[key] = process.env[key];
    }
    process.env[INSTITUTIONAL_WORKER_ENV_FLAG] = "1";
    process.env.ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT = "demo";
    process.env.ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY = "1";
    process.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID = "worker-test-anchor";
    process.env.ABRAXAS_STATUS_SIGNER_KEY_ID = "worker-test-status";

    const boot = await bootstrapInstitutionalSigningWorker(process.env);
    expect(boot.ok).toBe(true);
    if (!boot.ok) return;
    server = createInstitutionalSigningHttpServer({
      bearerToken: token,
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

  async function post(path: string, body: unknown, auth = true) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(auth ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it("rejects missing bearer authentication", async () => {
    const res = await post("/v1/health", {}, false);
    expect(res.status).toBe(401);
  });

  it("forbids arbitrary digest route", async () => {
    const res = await post("/v1/signRawDigest", { message: "00".repeat(32) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toMatchObject({ reason: "institutional_rpc_forbidden" });
  });

  it("returns 404 for unknown routes", async () => {
    const res = await post("/v1/issuer/sign-anything", {});
    expect(res.status).toBe(404);
  });

  it("fails authoritative issuer statement without database", async () => {
    const res = await post("/v1/authoritative/recorded-issuer-authority-statement", {
      anchorKeyId: "worker-test-anchor",
      issuedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("fails governance bypass on authority change", async () => {
    const res = await post("/v1/authoritative/authority-change-approval", {
      proposed: null,
      assertedAuthorityStateDigest: "ab".repeat(32),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, reason: "invalid_request" });
  });

  it("exposes health without private material", async () => {
    const res = await post("/v1/health", {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain("private");
    expect(json.ok).toBe(true);
  });
});
