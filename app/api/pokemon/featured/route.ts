// FILE: app/api/pokemon/featured/route.ts
// Pokemon marketplace feature removed. Returns 404.
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ error: "Feature not available" }, { status: 404 });
}