import { buildTrustRegistryCustodyStatusResponse } from "@/lib/solana/trustRegistry/governance/buildTrustRegistryCustodyStatusResponse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return buildTrustRegistryCustodyStatusResponse();
}
