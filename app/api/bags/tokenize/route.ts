// FILE: app/api/bags/tokenize/route.ts
// POST: tokenize a business revenue stream via Bags CLI.
// Wallet address comes from the request body (wallet-auth middleware).
// Never accepts raw shell commands from the client.
import { NextRequest, NextResponse } from "next/server";
import { tokenizeBagsRevenue }       from "@/lib/services/bagsService";
import { z }                          from "zod";

const BodySchema = z.object({
  cliArgs:      z.array(z.string()).max(20),
  businessName: z.string().min(1).max(200),
  walletAddress:z.string().length(44).regex(/^[1-9A-HJ-NP-Za-km-z]+$/),
  category:     z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error:"Invalid JSON" }, { status:400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error:"Invalid request", issues:parsed.error.issues }, { status:400 });
  }

  const result = await tokenizeBagsRevenue({
    cliArgs:      parsed.data.cliArgs,
    businessName: parsed.data.businessName,
    walletAddress:parsed.data.walletAddress,
    category:     parsed.data.category,
  });

  if (!result.success) {
    return NextResponse.json({ error:result.error, retries:result.retries }, { status:502 });
  }

  return NextResponse.json({
    success:     true,
    assetId:     result.assetId,
    certId:      result.certId,
    revenue:     result.parsed?.revenue,
    bagsId:      result.parsed?.bagsId,
    metadataUri: result.parsed?.metadataUri,
    message:     "Business revenue tokenized and anchored via Bags.fm",
  });
}