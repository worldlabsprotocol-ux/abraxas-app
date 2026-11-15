// FILE: app/api/public/deployment/route.ts
// Read-only release identifier for production drift checks (Vercel-injected SHA).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const git_commit_sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  return NextResponse.json({
    ok: true,
    git_commit_sha,
    vercel_env: process.env.VERCEL_ENV?.trim() || null,
  });
}