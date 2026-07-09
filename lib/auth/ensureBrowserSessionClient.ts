"use client";
// FILE: lib/auth/ensureBrowserSessionClient.ts
// Mint or refresh the httpOnly Passport browser session cookie (must complete before bind APIs).

export type EnsureBrowserSessionResult =
  | { ok: true }
  | { ok: false; reason: string; status?: number };

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

  return { ok: true };
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
