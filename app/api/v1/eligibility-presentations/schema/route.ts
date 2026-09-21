import { NextResponse } from "next/server";
import { eligibilityPresentationSchemaDocument } from "@/lib/eligibilityPresentation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(eligibilityPresentationSchemaDocument(), {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/schema+json",
    },
  });
}
