// FILE: lib/adminAuth.ts
// Admin access: PIN (pilot), admin email allowlist, or short-lived admin session cookie.

import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveBrowserSession } from "@/lib/auth/browserSession";

export const ADMIN_SESSION_COOKIE = "abraxas_admin_session";
const ADMIN_PIN = process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";
const ADMIN_SESSION_TTL_SEC = 60 * 60 * 8;

function adminSessionToken(): string | null {
  if (!ADMIN_PIN) return null;
  return createHash("sha256").update(`abraxas-admin:${ADMIN_PIN}`).digest("hex");
}

export function getAdminEmails(): string[] {
  return (process.env.ABRAXAS_ADMIN_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.includes("@")) return false;
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}

/** Legacy sync PIN check — prefer checkAdminAccess for routes. */
export function checkAdmin(req: NextRequest): boolean {
  if (!ADMIN_PIN) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-admin-pin") === ADMIN_PIN;
}

export function hasValidAdminSessionCookie(req: NextRequest): boolean {
  const token = adminSessionToken();
  if (!token) return false;
  return req.cookies.get(ADMIN_SESSION_COOKIE)?.value === token;
}

export function adminSessionCookieValue(): string | null {
  return adminSessionToken();
}

export function adminSessionCookieMaxAgeSec(): number {
  return ADMIN_SESSION_TTL_SEC;
}

async function emailForSuiAddress(suiAddress: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb
    .from("sui_zklogin_identities")
    .select("email")
    .eq("sui_address", suiAddress)
    .maybeSingle();

  return data?.email?.trim() ?? null;
}

export type AdminAccessMethod = "email" | "pin_header" | "pin_cookie" | null;

export type AdminAccessReason =
  | "authorized"
  | "pin_header"
  | "pin_cookie"
  | "email_allowlisted"
  | "no_session"
  | "email_not_allowlisted"
  | "allowlist_empty";

export async function resolveAdminAccess(req: NextRequest): Promise<{
  authorized: boolean;
  method: AdminAccessMethod;
  email?: string | null;
  reason: AdminAccessReason;
  allowlist_configured: boolean;
}> {
  if (checkAdmin(req)) {
    return { authorized: true, method: "pin_header", reason: "pin_header", allowlist_configured: getAdminEmails().length > 0 };
  }

  if (hasValidAdminSessionCookie(req)) {
    return { authorized: true, method: "pin_cookie", reason: "pin_cookie", allowlist_configured: getAdminEmails().length > 0 };
  }

  const allowlistConfigured = getAdminEmails().length > 0;
  const session = await resolveBrowserSession(req);
  if (!session) {
    return {
      authorized: false,
      method: null,
      reason: allowlistConfigured ? "no_session" : "allowlist_empty",
      allowlist_configured: allowlistConfigured,
    };
  }

  const email = await emailForSuiAddress(session.suiAddress);
  if (!allowlistConfigured) {
    return { authorized: false, method: null, email, reason: "allowlist_empty", allowlist_configured: false };
  }

  if (isAdminEmail(email)) {
    return { authorized: true, method: "email", email, reason: "email_allowlisted", allowlist_configured: true };
  }

  return { authorized: false, method: null, email, reason: "email_not_allowlisted", allowlist_configured: true };
}

export async function checkAdminAccess(req: NextRequest): Promise<boolean> {
  const access = await resolveAdminAccess(req);
  return access.authorized;
}
