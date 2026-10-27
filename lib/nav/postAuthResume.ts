// FILE: lib/nav/postAuthResume.ts
// Preserve the user's task across wallet sign-in (no second onboarding screen).

export const POST_AUTH_RESUME_STORAGE_KEY = "abraxas:resume-after-sign-in";

const RESUMABLE_PREFIXES = ["/developers/", "/developers/integration-studio"] as const;

export function isResumableDeveloperPath(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return RESUMABLE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function capturePostAuthResumePath(pathWithSearchHash: string): void {
  if (typeof window === "undefined") return;
  const path = pathWithSearchHash.split("#")[0] ?? pathWithSearchHash;
  if (!isResumableDeveloperPath(path)) return;
  try {
    sessionStorage.setItem(POST_AUTH_RESUME_STORAGE_KEY, pathWithSearchHash);
  } catch {
    /* ignore quota / private mode */
  }
}

export function consumePostAuthResumePath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(POST_AUTH_RESUME_STORAGE_KEY);
    sessionStorage.removeItem(POST_AUTH_RESUME_STORAGE_KEY);
    if (!value) return null;
    const path = value.split("#")[0] ?? value;
    return isResumableDeveloperPath(path) ? value : null;
  } catch {
    return null;
  }
}
