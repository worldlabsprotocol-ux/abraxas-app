import { NextRequest, NextResponse } from "next/server";
import { eligibilityWellKnownDocument } from "@/lib/eligibilityPresentation";
import { presentationLeaks } from "@/lib/eligibilityPresentation/safety";

export const dynamic = "force-dynamic";

export async function GET() {
  const document = eligibilityWellKnownDocument();
  if (presentationLeaks(document).length) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
