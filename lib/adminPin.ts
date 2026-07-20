// FILE: lib/adminPin.ts
// Admin PIN — must be set via env in production (no hardcoded fallback).

export function resolveAdminPin(): string | null {
  return process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? null;
}

export function adminPinConfigured(): boolean {
  return Boolean(resolveAdminPin());
}

export function verifyAdminPin(candidate: string): boolean {
  const pin = resolveAdminPin();
  if (!pin) return process.env.NODE_ENV !== "production";
  return candidate === pin;
}
