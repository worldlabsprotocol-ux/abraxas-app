// FILE: app/assets/[id]/page.tsx
// Rich asset detail page. provenance, custody, certificate, timeline, borrow.
// Fetches real data from /api/assets/[id] → get_asset_intelligence RPC.
// All imports at top. No client-only APIs used server-side.
import { Suspense }            from "react";
import { notFound }           from "next/navigation";
import { AssetDetailClient }  from "@/components/AssetDetailClient";

export const dynamic = "force-dynamic";

async function fetchAsset(id: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";
    const res  = await fetch(`${base}/api/assets/${id}`, { cache:"no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const data = await fetchAsset(params.id);
  if (!data?.asset) notFound();

  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#060810",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace",
                    fontSize:"0.6rem" }}>
        Loading asset data…
      </div>
    }>
      <AssetDetailClient data={data} />
    </Suspense>
  );
}