// FILE: lib/passport/reusableCredential/parseImport.ts

import type { SignedPassportReusableCredential } from "./contract";
import { PASSPORT_REUSABLE_CREDENTIAL_MEDIA_TYPE } from "./contract";

export function parseReusableCredentialImport(raw: unknown):
  | { ok: true; credential: SignedPassportReusableCredential }
  | { ok: false; code: string } {
  if (!raw || typeof raw !== "object") return { ok: false, code: "invalid_bundle" };
  const obj = raw as Record<string, unknown>;
  if (obj.media_type !== PASSPORT_REUSABLE_CREDENTIAL_MEDIA_TYPE) {
    return { ok: false, code: "unsupported_media_type" };
  }
  if (!obj.payload || typeof obj.payload !== "object") return { ok: false, code: "missing_payload" };
  if (typeof obj.payload_hash !== "string" || typeof obj.signature !== "string") {
    return { ok: false, code: "missing_signature" };
  }
  return { ok: true, credential: raw as SignedPassportReusableCredential };
}
