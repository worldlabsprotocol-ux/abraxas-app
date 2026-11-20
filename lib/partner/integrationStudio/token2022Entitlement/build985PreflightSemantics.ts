import type { ConnectedSandboxBoundaryResult } from "./connectedSandboxBoundary";
import type { EphemeralKvBackend } from "@/lib/auth/ephemeralWallet/redisKv";
import { ephemeralKvSupportsAtomicScripts, probeEphemeralKv } from "@/lib/auth/ephemeralWallet/redisKv";
import { connectedSandboxAtomicTransitionsSupported } from "./connectedSandboxAtomicBundle";

/** Operational readiness only — never issued by read-only preflight. */
export type Build985ConnectedChainVerificationStatus = "CONNECTED_SANDBOX_VERIFIED" | "NOT_PERFORMED";

export type Build985ConnectedOperationalStatus =
  | "NOT_CONFIGURED"
  | "BLOCKED"
  | "READY_FOR_CONNECTED_EXECUTION"
  | "NOT_PERFORMED";

export type RedactedRpcEndpoint =
  | { protocol: string; host: string; pathname: string; port?: string }
  | { invalid: true };

export type SanitizedConnectedBoundarySummary =
  | { ok: false; code: string; detail: string }
  | {
      ok: true;
      cluster_label: string;
      registry_admin: string;
      relying_party_admin: string;
      mint_and_consume_actionable: boolean;
      registry_pda: string;
      entitlement_mint_config_pda: string;
      trusted_config_pda: string;
      rpc_endpoint: RedactedRpcEndpoint;
    };

export type DistributedKvReadiness = {
  backend: EphemeralKvBackend;
  configured: boolean;
  connectivity_checked: boolean;
  connectivity_ok: boolean;
  connectivity_code: string | null;
  multi_instance_ready: boolean;
  atomic_prepare_jti_guarantee: "unsupported_backend" | "implementation_verified" | "not_validated";
  distributed_concurrency_acceptance: "NOT_PERFORMED" | "PASSED";
};

const PREFLIGHT_CONNECTED_VERIFICATION_DETAIL =
  "Read-only preflight never asserts wallet-signed mint/consume or independent verifier acceptance.";

export function redactRpcEndpoint(raw: string): RedactedRpcEndpoint {
  try {
    const u = new URL(raw);
    const out: RedactedRpcEndpoint = {
      protocol: u.protocol,
      host: u.hostname,
      pathname: u.pathname || "/",
    };
    if (u.port) out.port = u.port;
    return out;
  } catch {
    return { invalid: true };
  }
}

export function sanitizeConnectedBoundaryForPreflight(
  boundary: ConnectedSandboxBoundaryResult,
): SanitizedConnectedBoundarySummary {
  if (!boundary.ok) {
    return { ok: false, code: boundary.code, detail: boundary.detail };
  }
  return {
    ok: true,
    cluster_label: boundary.cluster_label,
    registry_admin: boundary.registry_admin,
    relying_party_admin: boundary.relying_party_admin,
    mint_and_consume_actionable: boundary.mint_and_consume_actionable,
    registry_pda: boundary.registry_pda,
    entitlement_mint_config_pda: boundary.entitlement_mint_config_pda,
    trusted_config_pda: boundary.trusted_config_pda,
    rpc_endpoint: redactRpcEndpoint(boundary.rpc_url),
  };
}

export function preflightConnectedVerificationStatus(): {
  status: Build985ConnectedChainVerificationStatus;
  detail: string;
} {
  return { status: "NOT_PERFORMED", detail: PREFLIGHT_CONNECTED_VERIFICATION_DETAIL };
}

export function derivePreflightOperationalStatus(input: {
  boundary: ConnectedSandboxBoundaryResult;
  kv: DistributedKvReadiness;
}): Build985ConnectedOperationalStatus {
  const { boundary, kv } = input;
  if (!boundary.ok) {
    if (boundary.code === "connected_sandbox_not_configured") return "NOT_CONFIGURED";
    return "BLOCKED";
  }
  if (!boundary.mint_and_consume_actionable) return "BLOCKED";
  if (!kv.multi_instance_ready) return "BLOCKED";
  return "READY_FOR_CONNECTED_EXECUTION";
}

export async function assessDistributedKvReadiness(
  env: Record<string, string | undefined> = process.env,
): Promise<DistributedKvReadiness> {
  const probe = await probeEphemeralKv(env);
  const configured = probe.backend !== "none";
  const connectivity_checked = configured;
  const atomicSupported =
    connectedSandboxAtomicTransitionsSupported(env) && ephemeralKvSupportsAtomicScripts(env);
  const distributedConcurrencyPassed = env.ABRAXAS_BUILD986_DISTRIBUTED_ATOMIC_ACCEPTANCE === "1";
  const atomicGuarantee: DistributedKvReadiness["atomic_prepare_jti_guarantee"] = !configured
    ? "not_validated"
    : !atomicSupported
      ? "unsupported_backend"
      : "implementation_verified";
  return {
    backend: probe.backend,
    configured,
    connectivity_checked,
    connectivity_ok: probe.ok,
    connectivity_code: probe.code,
    multi_instance_ready: configured && probe.ok && atomicSupported,
    atomic_prepare_jti_guarantee: atomicGuarantee,
    distributed_concurrency_acceptance: distributedConcurrencyPassed ? "PASSED" : "NOT_PERFORMED",
  };
}

const RPC_SECRET_PATTERNS = [
  /api[_-]?key=/i,
  /access[_-]?token=/i,
  /[?&]token=/i,
  /[?&]secret=/i,
  /Bearer\s+/i,
  /:\/\/[^/\s]+:[^@\s]+@/,
];

/** Throws when serialized report appears to embed RPC credentials or query secrets. */
export function assertPreflightReportHasNoRpcSecrets(serialized: string): void {
  for (const pattern of RPC_SECRET_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error(`preflight_report_leak:${pattern.source}`);
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return;
  }
  const walk = (value: unknown): void => {
    if (typeof value === "string") {
      if (value.includes("?") && (value.startsWith("http://") || value.startsWith("https://"))) {
        throw new Error("preflight_report_leak:raw_rpc_url");
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        if (key === "rpc_url") throw new Error("preflight_report_leak:rpc_url_field");
        walk(nested);
      }
    }
  };
  walk(parsed);
}

export function connectedClusterGoRecommendation(
  operational: Build985ConnectedOperationalStatus,
): string {
  if (operational === "READY_FOR_CONNECTED_EXECUTION") {
    return "NO-GO for connected verification — prerequisites appear ready; operator must run wallet-signed mint/consume and independent partner-verify before any CONNECTED_SANDBOX_VERIFIED claim.";
  }
  if (operational === "NOT_CONFIGURED") {
    return "NO-GO — operator sandbox env not configured.";
  }
  return "NO-GO — stop at operator configuration, deployment, or distributed-store boundary.";
}