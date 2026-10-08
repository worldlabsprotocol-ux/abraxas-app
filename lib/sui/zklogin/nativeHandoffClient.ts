// FILE: lib/sui/zklogin/nativeHandoffClient.ts
// Native holder handoff helpers — URL parsing, verifier persistence, completion signals.

import { getNativeHolderOrigin } from "./holderPlatform";
import {
  NATIVE_CONSUME_VERIFIER_SESSION_KEY,
  NATIVE_HANDOFF_CODE_QUERY,
} from "./nativeHandoff";
import {
  readLocalStorage,
  readSessionStorage,
  removeLocalStorage,
  removeSessionStorage,
  writeLocalStorage,
  writeSessionStorage,
} from "./browserStorage";

export const NATIVE_HANDOFF_SETTLED_EVENT = "abraxas:native-handoff-settled";

export type NativeHandoffSettledDetail = {
  ok: boolean;
  reason?: string;
};

/** Extract opaque handoff code from custom-scheme or https return URLs. */
export function parseHandoffCodeFromUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const code = parsed.searchParams.get(NATIVE_HANDOFF_CODE_QUERY)?.trim();
    if (code) return code;
  } catch {
    // Custom schemes may need manual parsing below.
  }

  const match = trimmed.match(/[?&]holder_native_handoff_code=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]).trim() : null;
}

/** Navigate the WebView to hosted Passport with the opaque handoff code. */
export function buildPassportHandoffUrl(handoffCode: string): string {
  const origin = getNativeHolderOrigin();
  const params = new URLSearchParams();
  params.set(NATIVE_HANDOFF_CODE_QUERY, handoffCode);
  return `${origin}/passport?${params.toString()}`;
}

export function storeNativeConsumeVerifier(verifier: string): void {
  writeSessionStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY, verifier);
  writeLocalStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY, verifier);
}

export function readNativeConsumeVerifier(): string | null {
  return (
    readSessionStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY)?.trim()
    ?? readLocalStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY)?.trim()
    ?? null
  );
}

export function clearNativeConsumeVerifier(): void {
  removeSessionStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
  removeLocalStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
}

export function dispatchNativeHandoffSettled(detail: NativeHandoffSettledDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NATIVE_HANDOFF_SETTLED_EVENT, { detail }));
}

export function handoffCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(NATIVE_HANDOFF_CODE_QUERY)?.trim() ?? null;
}
