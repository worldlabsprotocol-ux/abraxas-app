// FILE: lib/auth/nativeAccount/clientPasskeyCeremony.ts
// Browser-side WebAuthn ceremonies for native Abraxas accounts (shared by nav Connect and panels).

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export type PasskeyCeremonyResult =
  | { ok: true; accountId: string; mode: "authenticate" | "register" }
  | { ok: false; reason: "disabled" | "cancelled" | "error"; message?: string; code?: string };

export async function fetchNativeAuthEnabled(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/native/enabled", { credentials: "same-origin" });
    const json = (await res.json()) as { enabled?: boolean };
    return Boolean(json.enabled);
  } catch {
    return false;
  }
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("timed out") || msg.includes("timeout");
  }
  return false;
}

function isUserCancellation(error: unknown): boolean {
  if (isTimeoutError(error)) return false;
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    if (error instanceof Error && error.message.toLowerCase().includes("timed out")) return false;
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timed out")) return false;
    if (msg.includes("cancel") || msg.includes("abort")) return true;
  }
  return false;
}

/** Confirmed absence of a usable passkey on this device — safe to offer explicit registration. */
function isConfirmedNoPasskeyClientError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "InvalidStateError") return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("no passkey") ||
      msg.includes("not registered") ||
      msg.includes("no credentials") ||
      (msg.includes("cannot find") && !msg.includes("timed out"))
    );
  }
  return false;
}

export function isConfirmedNoPasskeyResult(result: PasskeyCeremonyResult): boolean {
  if (result.ok || result.reason === "cancelled") return false;
  return result.code === "no_passkey";
}

async function performPasskeyAuthentication(): Promise<PasskeyCeremonyResult> {
  const optRes = await fetch("/api/auth/native/passkey/authenticate/options", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const optJson = (await optRes.json()) as {
    ok?: boolean;
    options?: Parameters<typeof startAuthentication>[0]["optionsJSON"];
    challenge_id?: string;
    code?: string;
  };
  if (!optRes.ok || !optJson.options) {
    return {
      ok: false,
      reason: "error",
      code: optJson.code ?? "auth_options_failed",
      message: optJson.code ?? "Could not start passkey sign-in.",
    };
  }

  let assertion;
  try {
    assertion = await startAuthentication({ optionsJSON: optJson.options });
  } catch (error) {
    if (isUserCancellation(error)) {
      return { ok: false, reason: "cancelled" };
    }
    if (isTimeoutError(error)) {
      return {
        ok: false,
        reason: "error",
        code: "auth_timeout",
        message: "Passkey sign-in timed out. Try again when ready.",
      };
    }
    if (isConfirmedNoPasskeyClientError(error)) {
      return {
        ok: false,
        reason: "error",
        code: "no_passkey",
        message: "No passkey found for this device.",
      };
    }
    return {
      ok: false,
      reason: "error",
      code: "auth_failed",
      message: error instanceof Error ? error.message : "Passkey sign-in failed.",
    };
  }

  const verifyRes = await fetch("/api/auth/native/passkey/authenticate/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: optJson.challenge_id,
      response: assertion,
    }),
  });
  const verifyJson = (await verifyRes.json()) as {
    ok?: boolean;
    account_id?: string;
    code?: string;
  };
  if (!verifyRes.ok) {
    return {
      ok: false,
      reason: "error",
      code: verifyJson.code ?? "verification_failed",
      message: verifyJson.code ?? "Passkey sign-in could not be verified.",
    };
  }

  return { ok: true, accountId: verifyJson.account_id ?? "", mode: "authenticate" };
}

async function performPasskeyRegistration(): Promise<PasskeyCeremonyResult> {
  const optRes = await fetch("/api/auth/native/passkey/register/options", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const optJson = (await optRes.json()) as {
    options?: Parameters<typeof startRegistration>[0]["optionsJSON"];
    challenge_id?: string;
    code?: string;
  };
  if (!optRes.ok || !optJson.options) {
    return {
      ok: false,
      reason: "error",
      code: optJson.code ?? "register_options_failed",
      message: optJson.code ?? "Could not start passkey registration.",
    };
  }

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON: optJson.options });
  } catch (error) {
    if (isUserCancellation(error)) {
      return { ok: false, reason: "cancelled" };
    }
    if (isTimeoutError(error)) {
      return {
        ok: false,
        reason: "error",
        code: "register_timeout",
        message: "Passkey registration timed out. Try again when ready.",
      };
    }
    return {
      ok: false,
      reason: "error",
      code: "register_failed",
      message: error instanceof Error ? error.message : "Passkey registration failed.",
    };
  }

  const verifyRes = await fetch("/api/auth/native/passkey/register/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: optJson.challenge_id,
      response: attestation,
    }),
  });
  const verifyJson = (await verifyRes.json()) as { ok?: boolean; account_id?: string; code?: string };
  if (!verifyRes.ok) {
    return {
      ok: false,
      reason: "error",
      code: verifyJson.code,
      message: verifyJson.code ?? "Passkey registration failed.",
    };
  }

  return { ok: true, accountId: verifyJson.account_id ?? "", mode: "register" };
}

/** Connect entry — authenticate only; registration is a separate explicit user action. */
export async function connectNativePasskeyAccount(): Promise<PasskeyCeremonyResult> {
  const enabled = await fetchNativeAuthEnabled();
  if (!enabled) {
    return { ok: false, reason: "disabled" };
  }
  return performPasskeyAuthentication();
}

export async function runNativePasskeyAuthentication(): Promise<PasskeyCeremonyResult> {
  const enabled = await fetchNativeAuthEnabled();
  if (!enabled) return { ok: false, reason: "disabled" };
  return performPasskeyAuthentication();
}

export async function runNativePasskeyRegistration(): Promise<PasskeyCeremonyResult> {
  const enabled = await fetchNativeAuthEnabled();
  if (!enabled) return { ok: false, reason: "disabled" };
  return performPasskeyRegistration();
}
