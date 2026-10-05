// FILE: lib/partner/parsePartnerFlowInstant.ts
// Parse Postgres / Supabase timestamptz strings for partner-flow expiry checks.

/** Parse an instant from ISO or Postgres timestamptz text. Returns null when unparseable. */
export function parsePartnerFlowInstant(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidates = [
    trimmed,
    trimmed.replace(" ", "T"),
    trimmed.replace(/\+00$/, "+00:00"),
    trimmed.replace(" ", "T").replace(/\+00$/, "+00:00"),
  ];

  for (const candidate of candidates) {
    const ms = Date.parse(candidate);
    if (Number.isFinite(ms)) return ms;
  }

  return null;
}

/** Canonical ISO instant for persisted timestamptz reads. Returns null when unparseable. */
export function canonicalPartnerFlowInstant(value: string): string | null {
  const ms = parsePartnerFlowInstant(value);
  if (ms === null) return null;
  return new Date(ms).toISOString();
}
