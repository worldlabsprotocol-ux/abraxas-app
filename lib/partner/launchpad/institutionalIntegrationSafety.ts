// FILE: lib/partner/launchpad/institutionalIntegrationSafety.ts

const SECRET_PATTERNS = [
  /abx_live_/i,
  /abx_test_[a-z0-9]{20,}/i,
  /service.role/i,
  /SUPABASE_SERVICE_ROLE/i,
  /BEGIN PRIVATE KEY/i,
];

export function institutionalIntegrationPayloadLeaks(payload: unknown): string[] {
  const raw = JSON.stringify(payload);
  const hits: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(raw)) hits.push(pattern.source);
  }
  return hits;
}
