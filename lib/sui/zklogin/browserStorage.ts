// FILE: lib/sui/zklogin/browserStorage.ts
// Safe storage access during SSR (Next.js static generation).

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readSessionStorage(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSessionStorage(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function removeSessionStorage(key: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readLocalStorage(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function removeLocalStorage(key: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
