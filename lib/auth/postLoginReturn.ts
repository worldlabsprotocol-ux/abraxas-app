// FILE: lib/auth/postLoginReturn.ts
// Preserve same-origin return path across OAuth redirect (Connect, Cielo, etc.).

import { readSessionStorage, removeSessionStorage, writeSessionStorage } from "@/lib/sui/zklogin/browserStorage";

const POST_LOGIN_RETURN_KEY = "abraxas_post_login_return_v1";

/** Accept only same-origin relative paths (no protocol, no // open redirect). */
export function sanitizeReturnPath(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  let candidate = path.trim();
  try {
    if (/%[0-9A-Fa-f]{2}/.test(candidate)) {
      candidate = decodeURIComponent(candidate);
    }
  } catch {
    return null;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;
  if (candidate.includes("://")) return null;
  return candidate;
}

export function savePostLoginReturn(path: string): void {
  const safe = sanitizeReturnPath(path);
  if (!safe) return;
  writeSessionStorage(POST_LOGIN_RETURN_KEY, safe);
}

export function peekPostLoginReturn(): string | null {
  const raw = readSessionStorage(POST_LOGIN_RETURN_KEY);
  return sanitizeReturnPath(raw);
}

export function consumePostLoginReturn(): string | null {
  const path = peekPostLoginReturn();
  removeSessionStorage(POST_LOGIN_RETURN_KEY);
  return path;
}
