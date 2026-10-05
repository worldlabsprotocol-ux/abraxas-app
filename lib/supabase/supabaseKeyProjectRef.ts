// FILE: lib/supabase/supabaseKeyProjectRef.ts
// Derive Supabase project ref from JWT-shaped keys without logging key material.

function normalizeSupabaseJwtKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function decodeSupabaseJwtPayload(key: string): Record<string, unknown> | null {
  const trimmed = normalizeSupabaseJwtKey(key);
  if (!trimmed || !trimmed.includes(".")) return null;
  const parts = trimmed.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function supabaseJwtProjectRef(key: string): string | null {
  const json = decodeSupabaseJwtPayload(key);
  const ref = json?.ref;
  return typeof ref === "string" ? ref.toLowerCase() : null;
}

export function supabaseJwtRole(key: string): string | null {
  const json = decodeSupabaseJwtPayload(key);
  const role = json?.role;
  return typeof role === "string" ? role : null;
}

export function classifySupabaseServiceRoleKeyShape(key: string): "missing" | "bracket_wrapped" | "jwt" | "invalid" {
  const trimmed = key.trim();
  if (!trimmed) return "missing";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return "bracket_wrapped";
  if (trimmed.split(".").length >= 3 && decodeSupabaseJwtPayload(trimmed)) return "jwt";
  return "invalid";
}
