// FILE: lib/account/accountUseCasePreference.ts
// Client-only resume hint — not an authorization signal.

import type { AccountUseCaseId } from "@/lib/account/accountHubCopy";

const STORAGE_KEY = "abraxas_account_use_case_v1";

const VALID: AccountUseCaseId[] = ["verify_self", "connect_application", "manage_organization"];

export function readAccountUseCasePreference(): AccountUseCaseId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return VALID.includes(raw as AccountUseCaseId) ? (raw as AccountUseCaseId) : null;
  } catch {
    return null;
  }
}

export function writeAccountUseCasePreference(id: AccountUseCaseId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore quota / private mode
  }
}

export function clearAccountUseCasePreference(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
