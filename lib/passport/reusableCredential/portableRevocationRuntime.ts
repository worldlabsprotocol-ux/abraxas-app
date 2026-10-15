// FILE: lib/passport/reusableCredential/portableRevocationRuntime.ts
// Issuer-backed portable revocation: configured bootstrap trust and durable checkpoints only.

import "server-only";

import {
  FilesystemPortableRevocationCheckpointStore,
  InMemoryPortableRevocationCheckpointStore,
  type PortableRevocationBootstrapTrust,
  type PortableRevocationCheckpointStore,
} from "@/lib/protocol/portableRevocation";

export const PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV = "ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS";
export const PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV = "ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_DIR";
export const PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV =
  "ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST";

export function loadConfiguredPortableRevocationBootstrapTrusts(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): PortableRevocationBootstrapTrust[] {
  const raw = env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV]?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PortableRevocationBootstrapTrust[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type OpenPortableRevocationCheckpointStoreResult =
  | { ok: true; store: PortableRevocationCheckpointStore; durable: boolean }
  | { ok: false; code: "checkpoint_unconfigured" };

export async function openPortableRevocationCheckpointStore(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): Promise<OpenPortableRevocationCheckpointStoreResult> {
  const dir = env[PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV]?.trim();
  if (dir) {
    const store = await FilesystemPortableRevocationCheckpointStore.open(dir);
    return { ok: true, store, durable: true };
  }
  if (env[PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV] === "1") {
    return { ok: true, store: new InMemoryPortableRevocationCheckpointStore(), durable: false };
  }
  return { ok: false, code: "checkpoint_unconfigured" };
}
