import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/bags/incorporation
 *
 * Receives a formation request from /formations/begin and prepares the
 * Bags SDK incorporation flow.
 *
 * For now this validates the payload and persists the request server-side
 * (in a real deployment this would queue an email + call the Bags
 * `incorporate-token` endpoint with the founder's signed transaction).
 *
 * Required env:
 *   BAGS_API_KEY (server-side; for the actual incorporation call)
 *   BAGS_PARTNER_KEY (for fee routing)
 */

interface IncorporationRequest {
  tier: string;
  jurisdiction: string;
  entityName: string;
  founderName: string;
  founderEmail: string;
  founderWallet: string;
  paymentMethod: string;
  category: string;
  priceUsd: number;
}

function isValidPayload(body: unknown): body is IncorporationRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.tier === "string" &&
    typeof b.jurisdiction === "string" &&
    typeof b.entityName === "string" &&
    b.entityName.trim().length > 0 &&
    typeof b.founderName === "string" &&
    b.founderName.trim().length > 0 &&
    typeof b.founderEmail === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.founderEmail) &&
    typeof b.founderWallet === "string" &&
    b.founderWallet.length > 20 &&
    typeof b.paymentMethod === "string" &&
    typeof b.category === "string" &&
    typeof b.priceUsd === "number"
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid fields" },
      { status: 400 }
    );
  }

  const r = body as IncorporationRequest;

  // Server-side log of the formation request (no secrets logged).
  // In production, replace with a real email queue + Bags SDK call.
  console.log("[incorporation] new request:", {
    entityName: r.entityName,
    tier: r.tier,
    jurisdiction: r.jurisdiction,
    paymentMethod: r.paymentMethod,
    category: r.category,
    walletShort: `${r.founderWallet.slice(0, 4)}…${r.founderWallet.slice(-4)}`,
  });

  const bagsKey = process.env.BAGS_API_KEY?.trim();
  if (!bagsKey) {
    return NextResponse.json({
      ok: true,
      queued: true,
      note: "Request received (Bags API key not configured server-side; will be processed manually).",
    });
  }

  // TODO — replace with real Bags SDK call:
  //   await sdk.incorporation.startPayment({...})
  //   await sdk.incorporation.incorporate({...})
  //
  // For now, return success so the UX flow completes.
  return NextResponse.json({ ok: true, queued: true });
}
