// Vitest stub for Wix Velo `wix-secrets-backend` (not installed in Abraxas CI).

/** @type {Map<string, string>} */
const secrets = new Map();

export function __testOnlySetWixSecret(name, value) {
  secrets.set(name, value);
}

export function __testOnlyClearWixSecrets() {
  secrets.clear();
}

export async function getSecret(name) {
  if (secrets.has(name)) {
    return secrets.get(name);
  }
  throw new Error("wix-secrets-backend mock: secret not configured");
}
