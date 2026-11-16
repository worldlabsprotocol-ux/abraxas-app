// FILE: lib/privacy/auditorDisclosure/institutionalTenant.ts

export function resolveInstitutionalTenantId(input: {
  partnerId: string;
  env?: Record<string, string | undefined>;
}): string {
  const env = input.env ?? process.env;
  const pinned = env.ABRAXAS_INSTITUTIONAL_TENANT_ID?.trim();
  if (pinned) return pinned;
  const normalized = input.partnerId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `tenant_${normalized}`;
}