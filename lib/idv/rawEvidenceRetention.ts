// FILE: lib/idv/rawEvidenceRetention.ts
// Configurable raw identity evidence retention — operator/counsel must set production value.

export const RAW_IDENTITY_EVIDENCE_RETENTION_ENV = "RAW_IDENTITY_EVIDENCE_RETENTION_DAYS";

export type RawEvidenceRetentionConfig =
  | { ok: true; retentionDays: number }
  | { ok: false; error: string };

const MIN_DAYS = 1;
const MAX_DAYS = 3650;

export function resolveRawEvidenceRetentionDays(
  env: Record<string, string | undefined> = process.env,
): RawEvidenceRetentionConfig {
  const raw = env[RAW_IDENTITY_EVIDENCE_RETENTION_ENV]?.trim();
  if (!raw) {
    return {
      ok: false,
      error: `${RAW_IDENTITY_EVIDENCE_RETENTION_ENV} is not configured — operator must set an approved retention period`,
    };
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < MIN_DAYS || parsed > MAX_DAYS) {
    return {
      ok: false,
      error: `${RAW_IDENTITY_EVIDENCE_RETENTION_ENV} must be an integer between ${MIN_DAYS} and ${MAX_DAYS}`,
    };
  }

  return { ok: true, retentionDays: parsed };
}

export function computeRawEvidenceEligibleBefore(
  retentionDays: number,
  now: Date = new Date(),
): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  return cutoff;
}
