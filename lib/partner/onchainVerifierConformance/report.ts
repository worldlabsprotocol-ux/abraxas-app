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
  require_institutional: boolean;
  institutional_class: string;
  institutional_label: string;
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
    require_institutional: result.require_institutional,
    institutional_class: result.institutional_class,
    institutional_label: result.institutional_label,
    live: false,
    from_browser: false,
  };
}

export function reportLeaks(report: SafeConformanceReport): string[] {
  return Object.keys(report).filter((key) => !(ONCHAIN_VERIFIER_CONFORMANCE_REPORT_KEYS as readonly string[]).includes(key));
}
