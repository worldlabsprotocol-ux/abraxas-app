// FILE: lib/partner/integrationStudio/safety.ts
// Fail closed if studio JSON grows receipt material, keys, wallets, or PII.

const NEEDLES = [
  "abx_",
  "eyj",
  "service_role",
  "entity_secret",
  "wallet_address",
  "legal_name",
  "date_of_birth",
  "selfie",
  "id_token",
  "private_key",
  "seed phrase",
] as const;

export function studioPayloadLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  return NEEDLES.filter((needle) => blob.includes(needle));
}
