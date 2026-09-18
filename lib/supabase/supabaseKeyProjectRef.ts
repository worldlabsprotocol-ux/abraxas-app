// FILE: lib/supabase/supabaseKeyProjectRef.ts
// Derive Supabase project ref from JWT-shaped keys without logging key material.

export function supabaseJwtProjectRef(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed || !trimmed.includes(".")) return null;
  const parts = trimmed.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(Buffer.from(padded, "base64url").toString("utf8")) as {
      ref?: unknown;
    };
    return typeof json.ref === "string" ? json.ref.toLowerCase() : null;
  } catch {
    return null;
  }
}
