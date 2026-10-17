// FILE: lib/partner/build592/portableRevocationCheckpoint.ts

import {
  FilesystemPortableRevocationCheckpointStore,
  InMemoryPortableRevocationCheckpointStore,
  type PortableRevocationCheckpointStore,
} from "@/lib/protocol/portableRevocation";

export const BUILD592_PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV = "BUILD592_PORTABLE_REVOCATION_CHECKPOINT_DIR";
export const PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV = "ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_DIR";
export const PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV =
  "ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST";

export type PortableRevocationCheckpointStorageKind =
  | "durable_filesystem"
  | "ephemeral_in_memory";

export type OpenBuild592PortableRevocationCheckpointResult =
  | {
      ok: true;
      store: PortableRevocationCheckpointStore;
      storage: PortableRevocationCheckpointStorageKind;
      durable_cross_run_monotonicity: boolean;
    }
  | { ok: false; code: "portable_revocation_checkpoint_unconfigured" };

export function resolvePortableRevocationCheckpointDir(
  env: NodeJS.ProcessEnv = process.env,
  explicitDir?: string | null,
): string | null {
  const fromInput = explicitDir?.trim();
  if (fromInput) return fromInput;
  return (
    env[BUILD592_PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV]?.trim()
    ?? env[PORTABLE_REVOCATION_CHECKPOINT_DIR_ENV]?.trim()
    ?? env.RP_PORTABLE_REVOCATION_CHECKPOINT_DIR?.trim()
    ?? null
  );
}

export async function openBuild592PortableRevocationCheckpointStore(input: {
  env?: NodeJS.ProcessEnv;
  checkpointDir?: string | null;
  allowEphemeralForTests?: boolean;
}): Promise<OpenBuild592PortableRevocationCheckpointResult> {
  const env = input.env ?? process.env;
  const dir = resolvePortableRevocationCheckpointDir(env, input.checkpointDir);
  if (dir) {
    const store = await FilesystemPortableRevocationCheckpointStore.open(dir);
    return {
      ok: true,
      store,
      storage: "durable_filesystem",
      durable_cross_run_monotonicity: true,
    };
  }
  if (
    input.allowEphemeralForTests
    && env[PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV]?.trim() === "1"
  ) {
    return {
      ok: true,
      store: new InMemoryPortableRevocationCheckpointStore(),
      storage: "ephemeral_in_memory",
      durable_cross_run_monotonicity: false,
    };
  }
  return { ok: false, code: "portable_revocation_checkpoint_unconfigured" };
}
