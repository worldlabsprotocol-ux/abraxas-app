import type { CachedToken2022ConnectedConfirm, ConnectedSandboxPrepareAction } from "./connectedSandboxPrepareStore";
import {
  readCachedToken2022ConnectedConfirm,
  readConnectedSandboxPrepareRecord,
  requireConnectedSandboxPrepareStore,
} from "./connectedSandboxPrepareStore";

/** Returns a cached confirm only when it matches the currently stored preparation. */
export async function readCurrentPreparedToken2022Confirm(input: {
  jti: string;
  action: ConnectedSandboxPrepareAction;
  transactionSignature: string;
}): Promise<
  | { ok: true; cached: CachedToken2022ConnectedConfirm; message_hash_hex: string }
  | { ok: false; code: string; cached?: null }
> {
  const store = requireConnectedSandboxPrepareStore();
  if (!store.ok) return store;

  const prepared = await readConnectedSandboxPrepareRecord(input.jti, input.action);
  if (!prepared) return { ok: false, code: "connected_prepare_not_found" };

  const cached = await readCachedToken2022ConnectedConfirm({
    jti: input.jti,
    action: input.action,
    messageHashHex: prepared.message_hash_hex,
    transactionSignature: input.transactionSignature,
  });
  if (!cached) return { ok: false, code: "connected_confirm_cache_miss" };
  if (cached.preparation_generation !== prepared.generation) {
    return { ok: false, code: "connected_confirm_cache_miss" };
  }
  return { ok: true, cached, message_hash_hex: prepared.message_hash_hex };
}