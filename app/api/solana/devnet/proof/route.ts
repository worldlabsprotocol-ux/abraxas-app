import { Connection } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { enforceLaunchpadRateLimit } from "@/lib/partner/launchpad/apiHelpers";
import { verifyInstitutionalSolanaDevnetSignature } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetPublicProof";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store, must-revalidate" };

/** Public, read-only check of one finalized institutional devnet transaction. */
export async function GET(req: NextRequest) {
  const limited = enforceLaunchpadRateLimit(req, "/api/solana/devnet/proof", 10);
  if (limited) return limited;
  const query = req.nextUrl.searchParams;
  if (Array.from(query.keys()).some((key) => key !== "signature") || query.getAll("signature").length !== 1) {
    return NextResponse.json({ ok: false, reason: "invalid_query", broadcast: false }, { status: 400, headers });
  }
  const signature = query.get("signature") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) {
    return NextResponse.json({ ok: false, reason: "invalid_signature", broadcast: false }, { status: 400, headers });
  }
  const rpc = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL || "https://api.devnet.solana.com";
  let url: URL;
  try { url = new URL(rpc); } catch {
    return NextResponse.json({ ok: false, reason: "rpc_unavailable", broadcast: false }, { status: 503, headers });
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    return NextResponse.json({ ok: false, reason: "rpc_unavailable", broadcast: false }, { status: 503, headers });
  }
  const proof = await verifyInstitutionalSolanaDevnetSignature(signature, new Connection(url.toString(), "finalized"));
  const status = proof.ok ? 200 : proof.reason === "rpc_unavailable" ? 503 : 422;
  return NextResponse.json(proof, { status, headers });
}

