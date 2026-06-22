// FILE: app/api/reports/[assetId]/route.ts
// Pay-per-request access to a full verification report, using the
// x402 protocol (HTTP 402 Payment Required). No signup needed, a
// developer or an AI agent can pay a few cents in USDC and get the
// resource back in the same request cycle.
//
// HONEST NOTE: x402's exact client SDK/package names are still
// moving as the standard matures, so this implements the core
// protocol shape directly (return 402 with payment requirements,
// verify the payment proof header, then return the resource) rather
// than importing a specific package that might be stale by the time
// you run this. Swap in the official facilitator verification call
// where marked below once you've checked the current docs at
// https://x402.org or https://docs.cdp.coinbase.com/x402.
import { NextRequest, NextResponse } from "next/server";
import { INVEST_CONFIGS } from "@/components/terminal/investorConfigs";

const REPORT_PRICE_USDC = "0.10"; // a few cents, adjust as needed
const PAY_TO_ADDRESS = "circuit.skr"; // your treasury

export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  const paymentProof = req.headers.get("X-PAYMENT");

  if (!paymentProof) {
    // No payment yet, tell the client exactly what's required
    return NextResponse.json(
      {
        error: "Payment required",
        accepts: [{
          scheme: "exact",
          network: "solana",
          maxAmountRequired: REPORT_PRICE_USDC,
          asset: "USDC",
          payTo: PAY_TO_ADDRESS,
          resource: `/api/reports/${params.assetId}`,
          description: "Full verification report, confidence checks, and lending score for this asset",
        }],
      },
      { status: 402 }
    );
  }

  // TODO: verify paymentProof against the x402 facilitator before
  // trusting it, this is the one real gap, wire in the actual
  // facilitator call from the current x402 docs here. Until that's
  // wired in, this trusts the header, which is NOT safe for production,
  // treat this as the protocol shape, not a finished payment verifier.
  const asset = INVEST_CONFIGS[params.assetId];
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({
    asset: asset.name,
    confidenceChecks: asset.confidenceChecks,
    stats: asset.stats,
    historicalNote: asset.historicalNote,
  });
}
