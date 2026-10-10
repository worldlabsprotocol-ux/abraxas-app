// FILE: lib/auth/ensurePartnerHolderSession.ts
// Confirm holder session cookie before partner-flow evaluate/consent calls.

import { ensureBrowserSessionReady, probeBrowserSession } from "@/lib/auth/ensureBrowserSession";

const READY_PROBE_ATTEMPTS = 4;
const READY_PROBE_DELAY_MS = 80;

export async function probeWalletHolderSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/auth/holder-session", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json() as { ok?: boolean; passport_subject_ready?: boolean };
    return data.ok === true && Boolean(data.passport_subject_ready);
  } catch {
    return false;
  }
}

export async function ensurePartnerHolderSessionReady(input: {
  solanaNative: boolean;
  legacySubjectAddress: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (input.solanaNative) {
    for (let attempt = 0; attempt < READY_PROBE_ATTEMPTS; attempt += 1) {
      if (await probeWalletHolderSession()) {
        return { ok: true };
      }
      await new Promise((resolve) => setTimeout(resolve, READY_PROBE_DELAY_MS));
    }
    return { ok: false, error: "Sign in with your wallet to continue" };
  }

  if (!input.legacySubjectAddress) {
    return { ok: false, error: "Sign in required in this browser" };
  }

  if (await probeBrowserSession()) {
    return { ok: true };
  }

  return ensureBrowserSessionReady(input.legacySubjectAddress);
}
