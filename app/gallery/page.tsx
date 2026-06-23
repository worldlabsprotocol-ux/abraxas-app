"use client";
// FILE: app/gallery/page.tsx
// Real gallery for the La Casa Distortion collection, pulling live
// stats and NFTs from OpenSea's v2 API. Genesis-lore-style visual asset,
// treated as a real verified creative asset, same standard as everything
// else on Abraxas.

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";

interface GalleryNft { id: string; name: string; image: string; url: string; }
interface GalleryStats { floorPrice: number | null; volume: number | null; owners: number | null; supply: number | null; }

export default function GalleryPage() {
  const [nfts, setNfts] = useState<GalleryNft[] | null>(null);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gallery/la-casa")
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else { setNfts(data.nfts); setStats(data.stats); }
      })
      .catch(() => setError("Could not load the gallery right now"));
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#060810", color:"#fff",
                   fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ padding:"1rem clamp(1rem,3vw,1.5rem)",
                     borderBottom:"1px solid #1C2333",
                     display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
          <polygon points="20,2 38,20 20,38 2,20" stroke="#10B981" strokeWidth="2" fill="none"/>
          <polygon points="20,8 32,20 20,32 8,20" stroke="#10B981" strokeWidth="1.5" fill="rgba(16,185,129,0.1)"/>
          <circle cx="20" cy="20" r="3" fill="#10B981"/>
        </svg>
        <span style={{ fontSize:"0.85rem", fontWeight:700 }}>Gallery</span>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"2.5rem clamp(1rem,3vw,1.5rem)" }}>
        <div style={{ fontSize:"0.72rem", fontWeight:600, color:"#10B981", marginBottom:"0.5rem" }}>
          AAS-6 · Genesis Creative Collection
        </div>
        <h1 style={{ fontSize:"clamp(1.5rem,4vw,2.2rem)", fontWeight:700, margin:"0 0 0.75rem" }}>
          La Casa Distortion
        </h1>
        <p style={{ fontSize:"0.88rem", color:"rgba(255,255,255,0.5)",
                     lineHeight:1.7, maxWidth:600, margin:"0 0 1.5rem" }}>
          A real, owned, tokenized creative collection on Ethereum, verified
          the same way every other asset on Abraxas is.
        </p>

        {error ? (
          <div style={{ padding:"3rem 1.5rem", borderRadius:14,
                         border:"1px dashed #1C2333", textAlign:"center",
                         opacity:0.55 }}>
            <div style={{ fontSize:"0.95rem", fontWeight:700, marginBottom:"0.5rem" }}>
              Gallery coming soon
            </div>
            <div style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.4)",
                           maxWidth:380, margin:"0 auto", lineHeight:1.6 }}>
              Live collection data activates once OpenSea API access is connected.
            </div>
          </div>
        ) : nfts && nfts.length > 0 ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                         gap:"1rem" }}>
            {nfts.map(nft => (
              <a key={nft.id} href={nft.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration:"none", color:"inherit" }}>
                <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid #1C2333" }}>
                  <div style={{ aspectRatio:"1", background:"#0D1117" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={nft.image} alt={nft.name}
                         style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div style={{ padding:"0.625rem" }}>
                    <div style={{ fontSize:"0.76rem", fontWeight:600 }}>{nft.name}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.35)" }}>
            Loading collection...
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
