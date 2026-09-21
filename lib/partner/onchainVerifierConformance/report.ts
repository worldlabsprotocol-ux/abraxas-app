import { ONCHAIN_VERIFIER_CONFORMANCE_REPORT_KEYS } from "./contract";
import type { ConformanceResult } from "./verify";

export interface SafeConformanceReport {
  ok: boolean;
  command: string;
  gate_type: string;
  schema_version: string;
  network_id: string;
  deployment_ref: string;
  signer_key_id: string;
  reasons: string[];
  file_kind: string;
  live: false;
  from_browser: false;
}

export function serializeConformanceReport(command: string, result: ConformanceResult): SafeConformanceReport {
  return {
    ok: result.ok,
    command,
    gate_type: result.gate_type,
    schema_version: result.schema_version,
    network_id: result.network_id,
    deployment_ref: result.deployment_ref,
    signer_key_id: result.signer_key_id,
    reasons: result.ok ? ["permitted"] : result.reasons,
    file_kind: result.file_kind,
    live: false,
    from_browser: false,
  };
}

export function reportLeaks(report: SafeConformanceReport): string[] {
  return Object.keys(report).filter((key) => !(ONCHAIN_VERIFIER_CONFORMANCE_REPORT_KEYS as readonly string[]).includes(key));
}
