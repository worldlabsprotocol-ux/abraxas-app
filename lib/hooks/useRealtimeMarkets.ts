// FILE: lib/hooks/useRealtimeMarkets.ts
// Real-time Markets subscription — Supabase postgres_changes.
// When any asset changes to status='listed' anywhere, Markets refreshes automatically.
// Falls back to polling every 10s if Supabase not available.

"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAbraStore } from "@/lib/abraxasStore";

export interface MarketAsset {
  id:string; name:string; image_url?:string|null; category:string;
  price_usd:number; ltv:number; borrow_max_usd:number; status:string;
  owner_wallet?:string; token_id?:string; description?:string;
  custody_partner?:string; is_new?:boolean;
}

export function useRealtimeMarkets() {
  const [assets,    setAssets]    = useState<MarketAsset[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [lastEvent, setLastEvent] = useState<string>("");

  const storeListedAssets = useAbraStore(s=>s.getListedAssets());

  const fetchListed = useCallback(async () => {
    if (!supabase) {
      // Zustand fallback
      setAssets(storeListedAssets.map(a=>({
        id:a.id, name:a.name, image_url:a.imagePreview??null,
        category:a.assetClass, price_usd:a.estimatedUsd, ltv:a.ltv,
        borrow_max_usd:Math.round(a.estimatedUsd*a.ltv/100),
        status:"listed", owner_wallet:a.ownerWallet, token_id:a.tokenId, is_new:true,
      })));
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("status","listed")
      .order("created_at",{ascending:false});
    if (!error && data) {
      setAssets(data.map(row=>({
        id:row.id, name:row.name, image_url:row.image_url,
        category:row.category??"Other", price_usd:row.price_usd??0,
        ltv:row.ltv??55, borrow_max_usd:row.borrow_max_usd??0,
        status:row.status, owner_wallet:row.owner_wallet,
        token_id:row.token_id, custody_partner:row.custody_partner,
      })));
    }
    setLoading(false);
  }, [storeListedAssets]);

  useEffect(()=>{
    fetchListed();

    if (supabase) {
      // Real-time: re-fetch whenever any asset row changes
      const channel = supabase
        .channel("market-assets")
        .on("postgres_changes",
          { event:"*", schema:"public", table:"assets" },
          (payload)=>{
            setLastEvent(`${payload.eventType}:${(payload.new as any)?.id?.slice(0,8)}`);
            fetchListed(); // re-fetch to get latest listed set
          }
        )
        .subscribe();
      return ()=>{ supabase.removeChannel(channel); };
    } else {
      // Fallback: poll every 10s in demo mode
      const iv = setInterval(fetchListed, 10000);
      return ()=>clearInterval(iv);
    }
  }, [fetchListed]);

  return { assets, loading, lastEvent, refetch:fetchListed };
}