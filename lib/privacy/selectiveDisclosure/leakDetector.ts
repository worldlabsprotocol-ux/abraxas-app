// FILE: lib/privacy/selectiveDisclosure/leakDetector.ts
// Recursive leak detector for tests and fail-closed serialization checks.

const FORBIDDEN_KEYS = [
  "legal_name",
  "full_name",
  "given_name",
  "family_name",
  "date_of_birth",
  "dob",
  "street_address",
  "home_address",
  "wallet_address",
  "sui_address",
  "public_key",
  "private_key",
  "seed_phrase",
  "selfie",
  "biometric",
  "document_image",
  "passport_image",
  "claims_json",
  "credential_jwt",
  "id_token",
  "oauth_token",
  "oauth_sub",
  "provider_payload",
  "admin_note",
  "reviewer_note",
  "subject_id",
] as const;

const VALUE_PATTERNS: Array<{ id: string; test: (value: string) => boolean }> = [
  { id: "email_like", test: (value) => /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value) },
  { id: "jwt", test: (value) => /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/.test(value) },
  { id: "live_secret", test: (value) => /abx_(live|test|whsec)_/i.test(value) },
  { id: "sql_error", test: (value) => /SQLSTATE|relation [a-z_]+ does not exist/i.test(value) },
  { id: "wallet_hex", test: (value) => /0x[a-f0-9]{40,}/i.test(value) },
];

export function detectDisclosureLeaks(payload: unknown, path = "$"): string[] {
  const hits: string[] = [];
  walk(payload, path, hits);
  return hits;
}

function walk(node: unknown, path: string, hits: string[]): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, `${path}[${index}]`, hits));
    return;
  }
  if (typeof node === "string") {
    VALUE_PATTERNS.forEach((pattern) => {
      if (pattern.test(node)) hits.push(`${path}:${pattern.id}`);
    });
    return;
  }
  if (typeof node !== "object") return;
  Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
    const lower = key.toLowerCase();
    if ((FORBIDDEN_KEYS as readonly string[]).includes(lower)) {
      hits.push(`${path}.${key}:forbidden_key`);
    }
    walk(value, `${path}.${key}`, hits);
  });
}
