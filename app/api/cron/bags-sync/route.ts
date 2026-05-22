// FILE: app/api/cron/bags-sync/route.ts
// Daily sync of all Bags-tokenized revenue assets.
// Vercel Hobby plan: ONE cron per day maximum.
// Schedule: "0 0 * * *" (daily at midnight UTC) — set in vercel.json
// Protected with CRON_SECRET env var.
import { NextRequest, NextResponse } from "next/server";
import { syncBagsRevenue }           from "@/lib/services/bagsService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  }

  try {
    const result = await syncBagsRevenue();
    return NextResponse.json({
      success:  true,
      synced:   result.synced,
      failed:   result.failed,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success:false, error:msg }, { status:500 });
  }
}
