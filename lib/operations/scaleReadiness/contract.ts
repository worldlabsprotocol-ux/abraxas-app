// FILE: lib/operations/scaleReadiness/contract.ts
// Machine-readable scale/operations readiness — backend facts only, no vanity scores.

export const SCALE_READINESS_VERSION = "1.0.0" as const;

export type ScaleReadinessSignal = "healthy" | "degraded" | "blocked" | "unknown";

export interface ScaleReadinessCheck {
  id: string;
  signal: ScaleReadinessSignal;
  detail: string;
  /** P0–P3 classification for operator prioritization */
  severity: "P0" | "P1" | "P2" | "P3";
}

export interface ScaleReadinessReport {
  schema_version: typeof SCALE_READINESS_VERSION;
  generated_at: string;
  overall: ScaleReadinessSignal;
  checks: ScaleReadinessCheck[];
  /** Explicit non-claims — we do not assert internet-scale readiness */
  scope_notice: string;
}

export const SCALE_READINESS_SCOPE_NOTICE =
  "This report surfaces operational facts and known architectural risks. It does not claim millions-of-users readiness or production scale proof.";
