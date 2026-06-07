// FILE: app/api/auth/[...nextauth]/route.ts
// next-auth removed. This stub prevents module-not-found errors.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Auth not configured" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: "Auth not configured" }, { status: 501 });
}
