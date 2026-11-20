import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConnectedSandboxBoundaryResult } from "./connectedSandboxBoundary";
import { buildBuild985PreflightReport } from "./build985PreflightReport";
import {
  assertPreflightReportHasNoRpcSecrets,
  derivePreflightOperationalStatus,
  preflightConnectedVerificationStatus,
  redactRpcEndpoint,
  sanitizeConnectedBoundaryForPreflight,
  type DistributedKvReadiness,
} from "./build985PreflightSemantics";
import { evaluateConnectedSandboxBoundary } from "./connectedSandboxBoundary";
import { connectedSandboxAttestationsReady } from "./connectedSandboxConfig";

const actionableBoundary: Extract<ConnectedSandboxBoundaryResult, { ok: true }> = {
  ok: true,
  rpc_url: "https://api.example.com/v1/rpc?api-key=SUPERSECRET&token=abcdef",
  cluster_label: "sandbox-test",
  registry_admin: "11111111111111111111111111111112",
  relying_party_admin: "22222222222222222222222222222223",
  mint_and_consume_actionable: true,
  registry_pda: "reg",
  entitlement_mint_config_pda: "mc",
  trusted_config_pda: "tc",
};

const kvReady: DistributedKvReadiness = {
  backend: "upstash",
  configured: true,
  connectivity_checked: true,
  connectivity_ok: true,
  connectivity_code: null,
  multi_instance_ready: true,
  atomic_prepare_jti_guarantee: "unresolved_documented",
};

const kvMissing: DistributedKvReadiness = {
  backend: "none",
  configured: false,
  connectivity_checked: false,
  connectivity_ok: false,
  connectivity_code: "ephemeral_state_not_configured",
  multi_instance_ready: false,
  atomic_prepare_jti_guarantee: "unresolved_documented",
};

describe("BUILD #985 preflight semantics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never reports CONNECTED_SANDBOX_VERIFIED from preflight verification helper", () => {
    const v = preflightConnectedVerificationStatus();
    expect(v.status).toBe("NOT_PERFORMED");
    expect(v.status).not.toBe("CONNECTED_SANDBOX_VERIFIED");
  });

  it("maps missing configuration to NOT_CONFIGURED", async () => {
    const prior = { ...process.env };
    for (const key of [
      "ABRAXAS_PROOF_CONTINUITY_RPC_URL",
      "ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN",
      "ABRAXAS_ENTITLEMENT_RELYING_PARTY_ADMIN",
      "BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY",
    ]) {
      delete process.env[key];
    }
    expect(connectedSandboxAttestationsReady()).toBe(false);
    const boundary = await evaluateConnectedSandboxBoundary();
    expect(boundary.ok).toBe(false);
    if (!boundary.ok) {
      expect(derivePreflightOperationalStatus({ boundary, kv: kvMissing })).toBe("NOT_CONFIGURED");
    }
    process.env = prior;
  });

  it("maps wrong genesis and attestation mismatch to BLOCKED", () => {
    const wrongGenesis: ConnectedSandboxBoundaryResult = {
      ok: false,
      code: "wrong_cluster",
      detail: "RPC genesis hash does not match pinned cluster identity.",
    };
    const digestMismatch: ConnectedSandboxBoundaryResult = {
      ok: false,
      code: "proof_continuity_program_attestation_mismatch",
      detail: "Deployed proof continuity bytecode does not match operator attestation.",
    };
    expect(derivePreflightOperationalStatus({ boundary: wrongGenesis, kv: kvReady })).toBe("BLOCKED");
    expect(derivePreflightOperationalStatus({ boundary: digestMismatch, kv: kvReady })).toBe("BLOCKED");
  });

  it("maps actionable boundary without KV to BLOCKED (not READY)", () => {
    expect(
      derivePreflightOperationalStatus({ boundary: actionableBoundary, kv: kvMissing }),
    ).toBe("BLOCKED");
  });

  it("maps actionable boundary with KV to READY_FOR_CONNECTED_EXECUTION only", () => {
    expect(
      derivePreflightOperationalStatus({ boundary: actionableBoundary, kv: kvReady }),
    ).toBe("READY_FOR_CONNECTED_EXECUTION");
  });

  it("redacts secret-bearing RPC URLs and strips query credentials", () => {
    const redacted = redactRpcEndpoint(
      "https://user:password@private.rpc.example/solana?api-key=leak&access_token=xyz",
    );
    expect(redacted).toMatchObject({
      protocol: "https:",
      host: "private.rpc.example",
      pathname: "/solana",
    });
    expect(JSON.stringify(redacted)).not.toContain("api-key");
    expect(JSON.stringify(redacted)).not.toContain("password");
  });

  it("omits raw rpc_url from sanitized boundary summary", () => {
    const summary = sanitizeConnectedBoundaryForPreflight(actionableBoundary);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect("rpc_url" in summary).toBe(false);
      expect(summary.rpc_endpoint).toMatchObject({ host: "api.example.com" });
    }
    const leaked = JSON.stringify(summary);
    expect(leaked).not.toContain("SUPERSECRET");
    expect(leaked).not.toContain("api-key");
  });

  it("rejects serialized reports that embed rpc_url or query secrets", () => {
    expect(() => assertPreflightReportHasNoRpcSecrets('{"rpc_url":"https://x?api-key=1"}')).toThrow(
      /preflight_report_leak/,
    );
    expect(() =>
      assertPreflightReportHasNoRpcSecrets(
        '{"endpoint":"https://host/path?access_token=secret"}',
      ),
    ).toThrow(/preflight_report_leak/);
    expect(() =>
      assertPreflightReportHasNoRpcSecrets(JSON.stringify({ ok: true, rpc_endpoint: { host: "h" } })),
    ).not.toThrow();
  });

  it("configured actionable report never claims connected verification", async () => {
    const report = await buildBuild985PreflightReport({
      boundary: actionableBoundary,
      env: { VITEST: "true", NODE_ENV: "test" },
    });
    expect(report.acceptance.connected_chain_verification.status).toBe("NOT_PERFORMED");
    expect(report.acceptance.connected_operational_status).toBe("BLOCKED");
    const wire = JSON.stringify(report);
    expect(wire).not.toContain("SUPERSECRET");
    expect(report.go_no_go.connected_cluster).toMatch(/^NO-GO/);
    assertPreflightReportHasNoRpcSecrets(wire);
  });

  it("reports atomic implementation status without claiming distributed concurrency unless env set", async () => {
    const report = await buildBuild985PreflightReport({
      boundary: actionableBoundary,
      env: { VITEST: "true" },
    });
    expect(report.distributed_kv_readiness.atomic_prepare_jti_guarantee).toBe("not_validated");
    expect(report.distributed_kv_readiness.distributed_concurrency_acceptance).toBe("NOT_PERFORMED");
    expect(report.distributed_replay_notes[0]).toMatch(/atomic bundle/i);
  });
});