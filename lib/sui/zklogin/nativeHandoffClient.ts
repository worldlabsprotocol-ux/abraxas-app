// FILE: lib/sui/zklogin/nativeHandoffClient.ts
// Native holder handoff helpers — URL parsing, verifier persistence, completion signals.

import { getNativeHolderOrigin } from "./holderPlatform";
import {
  NATIVE_CONSUME_VERIFIER_SESSION_KEY,
  NATIVE_HANDOFF_CODE_QUERY,
  NATIVE_HANDOFF_TTL_SEC,
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

export const NATIVE_HANDOFF_CUSTOM_SCHEME = "xyz.abraxasworld.app";
export const NATIVE_HANDOFF_CUSTOM_HOST = "passport";
export const NATIVE_HANDOFF_HTTPS_PATH = "/passport";

/** base64url encoding of 24 random bytes from server mintNativeHandoffCode */
export const NATIVE_HANDOFF_CODE_PATTERN = /^[A-Za-z0-9_-]{32,48}$/;

export const NATIVE_CONSUME_VERIFIER_TTL_MS = NATIVE_HANDOFF_TTL_SEC * 1000;

export type NativeHandoffSettledDetail = {
  ok: boolean;
  reason?: string;
};

type StoredNativeConsumeVerifier = {
  v: 1;
  verifier: string;
  oauthState: string;
  expiresAtMs: number;
};

export function isValidHandoffCode(code: string): boolean {
  return NATIVE_HANDOFF_CODE_PATTERN.test(code.trim());
}

function isApprovedNativeHandoffUrl(parsed: URL): boolean {
  const approvedHttpsOrigin = getNativeHolderOrigin();

  if (parsed.protocol === `${NATIVE_HANDOFF_CUSTOM_SCHEME}:`) {
    if (parsed.username || parsed.password) return false;
    if (parsed.hostname !== NATIVE_HANDOFF_CUSTOM_HOST) return false;
    if (parsed.port) return false;
    if (parsed.pathname && parsed.pathname !== "/") return false;
    return true;
  }

  if (parsed.protocol === "https:") {
    const origin = `${parsed.protocol}//${parsed.host}`;
    if (origin !== approvedHttpsOrigin) return false;
    if (parsed.pathname !== NATIVE_HANDOFF_HTTPS_PATH) return false;
    return true;
  }

  return false;
}

function extractValidatedHandoffCode(parsed: URL): string | null {
  const paramKeys = [...parsed.searchParams.keys()];
  if (paramKeys.length !== 1 || paramKeys[0] !== NATIVE_HANDOFF_CODE_QUERY) return null;

  const rawCode = parsed.searchParams.get(NATIVE_HANDOFF_CODE_QUERY);
  if (!rawCode) return null;

  let code: string;
  try {
    code = decodeURIComponent(rawCode).trim();
  } catch {
    return null;
  }

  if (!isValidHandoffCode(code)) return null;
  return code;
}

/** Extract opaque handoff code from approved custom-scheme or https Passport URLs. */
export function parseHandoffCodeFromUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (!isApprovedNativeHandoffUrl(parsed)) return null;
  return extractValidatedHandoffCode(parsed);
}

/** Navigate the WebView to hosted Passport with the opaque handoff code. */
export function buildPassportHandoffUrl(handoffCode: string): string | null {
  if (!isValidHandoffCode(handoffCode)) return null;
  const origin = getNativeHolderOrigin();
  const params = new URLSearchParams();
  params.set(NATIVE_HANDOFF_CODE_QUERY, handoffCode);
  return `${origin}${NATIVE_HANDOFF_HTTPS_PATH}?${params.toString()}`;
}

function parseStoredConsumeVerifier(raw: string | null): StoredNativeConsumeVerifier | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredNativeConsumeVerifier;
    if (parsed.v !== 1) return null;
    if (typeof parsed.verifier !== "string" || !parsed.verifier.trim()) return null;
    if (typeof parsed.oauthState !== "string" || !parsed.oauthState.trim()) return null;
    if (typeof parsed.expiresAtMs !== "number" || !Number.isFinite(parsed.expiresAtMs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readStoredConsumeVerifierRecord(): StoredNativeConsumeVerifier | null {
  return (
    parseStoredConsumeVerifier(readSessionStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY))
    ?? parseStoredConsumeVerifier(readLocalStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY))
  );
}

function writeStoredConsumeVerifierRecord(record: StoredNativeConsumeVerifier): void {
  const serialized = JSON.stringify(record);
  writeSessionStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY, serialized);
  writeLocalStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY, serialized);
}

/** Bind consume verifier to the active OAuth transaction and persist across WebView recreation. */
export function storeNativeConsumeVerifier(verifier: string, oauthState: string): void {
  const trimmedVerifier = verifier.trim();
  const trimmedOauthState = oauthState.trim();
  if (!trimmedVerifier || !trimmedOauthState) return;

  const record: StoredNativeConsumeVerifier = {
    v: 1,
    verifier: trimmedVerifier,
    oauthState: trimmedOauthState,
    expiresAtMs: Date.now() + NATIVE_CONSUME_VERIFIER_TTL_MS,
  };
  writeStoredConsumeVerifierRecord(record);
}

export function readNativeConsumeVerifier(): string | null {
  const record = readStoredConsumeVerifierRecord();
  if (!record) return null;
  if (Date.now() > record.expiresAtMs) {
    clearNativeConsumeVerifier();
    return null;
  }
  return record.verifier;
}

export function clearNativeConsumeVerifier(): void {
  removeSessionStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
  removeLocalStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
}

export function isTerminalNativeHandoffConsumeStatus(status: number): boolean {
  return status === 400
    || status === 401
    || status === 403
    || status === 404
    || status === 409
    || status === 410;
}

export function dispatchNativeHandoffSettled(detail: NativeHandoffSettledDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NATIVE_HANDOFF_SETTLED_EVENT, { detail }));
}

export function handoffCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const code = params.get(NATIVE_HANDOFF_CODE_QUERY)?.trim();
  if (!code || !isValidHandoffCode(code)) return null;
  return code;
}

export function createNativeHandoffIngressHandler(
  navigate: (handoffCode: string) => void,
): {
  handleUrl: (rawUrl: string) => void;
  resetForTests: () => void;
} {
  const seenCodes = new Set<string>();

  return {
    handleUrl(rawUrl: string) {
      const code = parseHandoffCodeFromUrl(rawUrl);
      if (!code) return;
      if (seenCodes.has(code)) return;
      seenCodes.add(code);
      navigate(code);
    },
    resetForTests() {
      seenCodes.clear();
    },
  };
}
