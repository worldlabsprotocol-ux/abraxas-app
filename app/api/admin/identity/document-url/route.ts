// FILE: app/api/admin/identity/document-url/route.ts
// Signed URL for admin identity review — ID/selfie preview only.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/adminAuth";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SIGNED_URL_TTL_SEC = 3600;

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const storagePath = req.nextUrl.searchParams.get("path")?.trim();
  if (!storagePath || !storagePath.startsWith("identity/")) {
    return NextResponse.json({ error: "Valid identity storage path required" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.storage
    .from("passport-documents")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not sign URL" }, { status: 404 });
  }

  return NextResponse.json({
    signed_url: data.signedUrl,
    expires_in_sec: SIGNED_URL_TTL_SEC,
  });
}
