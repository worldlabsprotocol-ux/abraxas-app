const MIN_SECRET_BYTES = 32;

export function resolvePrepareBindingHmacSecret(): string | null {
  const explicit = process.env.BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY?.trim();
  if (!explicit) return null;
  if (Buffer.byteLength(explicit, "utf8") < MIN_SECRET_BYTES) return null;
  return explicit;
}

export function assertPrepareBindingHmacConfigured():
  | { ok: true; secret: string }
  | { ok: false; code: string } {
  const secret = resolvePrepareBindingHmacSecret();
  if (!secret) return { ok: false, code: "prepare_binding_hmac_key_required" };
  return { ok: true, secret };
}