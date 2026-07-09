// FILE: app/api/idv/callback/route.ts
// Veriff redirects the user's browser here after the in-context flow.
// (The real verification decision arrives separately at /api/idv/webhook.)
// This route simply lands the user back on the Passport with a friendly
// status flag so they never hit a 404 mid-onboarding.

import { NextResponse, type NextRequest } from "next/server";

function landing(req: NextRequest, complete: boolean) {
  const url = new URL("/passport", req.nextUrl.origin);
  url.searchParams.set("verification", complete ? "complete" : "pending");
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  return landing(req, status === "approved");
}

export async function POST(req: NextRequest) {
  return landing(req, false);
}
