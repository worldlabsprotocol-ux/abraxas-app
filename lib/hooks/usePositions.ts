// FILE: lib/hooks/usePositions.ts
// Vault positions for a wallet — DB-first, Zustand fallback.
// Powers Capital/Vaults tab: LTV, exposure, collateral breakdown.

"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAbraStore } from "@/lib/abraxasStore";
import { useWallet } from "@solana/wallet-adapter-react";

export interface Position {
  id:string; wallet:string; assetId:string;
  positionType:"collateral"|"borrow";
  ltvRatio:number; exposure:number; createdAt:string;
  asset?: { name:string; category:string; image_url:string|null;
            price_usd:number; ltv:number; custody_partner:string; status:string; };
}

export function usePositions() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading,   setLoading]   = useState(true);
  const storePositions = useAbraStore(s => s.positions);

  useEffect(() => {
    if (!wallet) {
      // No wallet — show store positions for demo
      setPositions(
        storePositions
          .filter(p => p.positionType === "collateral" || p.positionType === "borrow")
          .map(p => ({
            id:p.id, wallet:p.wallet, assetId:p.assetId,
            positionType: p.positionType as "collateral"|"borrow",
            ltvRatio:p.ltvRatio,
            exposure:p.exposureValue,
            createdAt: new Date(p.createdAt).toISOString(),
          }))
      );
      setLoading(false);
      return;
    }

    if (supabase) {
      supabase.from("positions")
        .select(`*, assets(name, category, image_url, price_usd, ltv, custody_partner, status)`)
        .eq("wallet", wallet)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setPositions(data.map(row => ({
              id:row.id, wallet:row.wallet, assetId:row.asset_id,
              positionType:row.position_type, ltvRatio:row.ltv_ratio,
              exposure:row.exposure, createdAt:row.created_at,
              asset:row.assets,
            })));
          }
          setLoading(false);
        });
    } else {
      setPositions(storePositions
        .filter(p => p.wallet === wallet &&
          (p.positionType === "collateral" || p.positionType === "borrow"))
        .map(p => ({
          id:p.id, wallet:p.wallet, assetId:p.assetId,
          positionType: p.positionType as "collateral"|"borrow",
          ltvRatio:p.ltvRatio,
          exposure:p.exposureValue,
          createdAt: new Date(p.createdAt).toISOString(),
        }))
      );
      setLoading(false);
    }
  }, [wallet, storePositions]);

  const totalExposure    = positions.reduce((s,p) => s + p.exposure, 0);
  const collateralCount  = positions.filter(p => p.positionType === "collateral").length;
  const borrowCount      = positions.filter(p => p.positionType === "borrow").length;

  return { positions, loading, totalExposure, collateralCount, borrowCount };
}