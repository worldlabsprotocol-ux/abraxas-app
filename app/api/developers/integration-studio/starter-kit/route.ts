// FILE: app/api/developers/integration-studio/starter-kit/route.ts
// Public starter-kit generator. Placeholders only. Rate-limited.

import { NextRequest, NextResponse } from "next/server";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import { generateStarterKit, starterKitPublicCatalog, validateStarterKitInput } from "@/lib/partner/starterKit";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = {
    ...starterKitPublicCatalog(),
    access: "public",
    generates_live_credentials: false,
  };
  if (studioPayloadLeaks(body).length > 0) {
    return NextResponse.json({ error: "redacted" }, { status: 503 });
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const limited = checkLaunchpadRateLimit(req, "/api/developers/integration-studio/starter-kit", 20);
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const validated = validateStarterKitInput(raw);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.code }, { status: 400 });
  }

  const kit = generateStarterKit(validated.selection);
  if (!kit.ok) {
    return NextResponse.json({ ok: false, error: kit.code }, { status: 503 });
  }

  return NextResponse.json(kit, { headers: { "Cache-Control": "no-store" } });
}
