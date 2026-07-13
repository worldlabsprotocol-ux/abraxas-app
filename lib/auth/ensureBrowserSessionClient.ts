"use client";
// FILE: lib/auth/ensureBrowserSessionClient.ts
// Mint or refresh the httpOnly Passport browser session cookie (must complete before bind APIs).

export type EnsureBrowserSessionResult =
  | { ok: true }
  | { ok: false; reason: string; status?: number };

const PROBE_RETRY_DELAYS_MS = [0, 100, 250, 500];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function probeBrowserSession(): Promise<{
  authenticated: boolean;
  sui_address?: string;
}> {
  const res = await fetch("/api/auth/browser-session", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) return { authenticated: false };
  return res.json() as Promise<{ authenticated: boolean; sui_address?: string }>;
}

async function probeBrowserSessionWithRetry(): Promise<boolean> {
  for (const delay of PROBE_RETRY_DELAYS_MS) {
    if (delay > 0) await sleep(delay);
    const probe = await probeBrowserSession();
    if (probe.authenticated) return true;
  }
  return false;
}

export async function ensureBrowserSession(suiAddress: string): Promise<EnsureBrowserSessionResult> {
  const res = await fetch("/api/auth/browser-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sui_address: suiAddress }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    return {
      ok: false,
      reason: data.error ?? `Session setup failed (${res.status})`,
      status: res.status,
    };
  }

  const confirmed = await probeBrowserSessionWithRetry();
  if (!confirmed) {
    return {
      ok: false,
      reason: "Session cookie could not be confirmed in this browser",
    };
  }

  return { ok: true };
}

export async function revokeBrowserSession(): Promise<void> {
  await fetch("/api/auth/browser-session", {
    method: "DELETE",
    credentials: "include",
  });
}
