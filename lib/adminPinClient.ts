// FILE: lib/adminPinClient.ts
// Client-side admin PIN prefill — empty in production (PIN is never in the browser bundle).

export function getAdminPinPrefill(): string {
  if (process.env.NODE_ENV === "production") return "";
  return process.env.NEXT_PUBLIC_ADMIN_PIN ?? "abraxas2026";
}
