import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ error: "auth not configured" }, { status: 501 }); }
export async function POST() { return NextResponse.json({ error: "auth not configured" }, { status: 501 }); }
