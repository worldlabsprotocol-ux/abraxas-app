// FILE: lib/hooks/useWalletAssets.ts
// Fetches real assets from Supabase via wallet route.
// Falls back to Zustand store if Supabase not configured.
// Merges both sources — never shows empty when local data exists.
"use client";

import { useState, useEffect } from "react";
import { useWallet }           from "@solana/wallet-adapter-react";
import { useAbraStore }        from "@/lib/abraxasStore";

export interface SupabaseAsset {
  id:                  string;
  title:               string;
  category:            string;
  owner_wallet:        string;
  declared_value_usd:  number;
  verification_status: string;
  collateral_score:    number | null;
  fraud_risk_score:    number;
  active_flag_count:   number;
  ltv:                 number;
  mint_cost_abra:      number;
  submitted_at:        string;
  verified_at:         string | null;
  certificate_id?:     string;
  facility_location?:  string;
  confidence_score?:   number;
  interest_type?:      string;
  // Mapped for UI compatibility
  name?:               string;
  assetClass?:         string;
  estimatedUsd?:       number;
  status?:             string;
  mintCostAbra?:       number;
  createdAt?:          number;
  tokenId?:            string;
  txSignature?:        string;
}

function mapToStoreFormat(a: SupabaseAsset): SupabaseAsset {
  return {
    ...a,
    name:         a.title,
    assetClass:   a.category,
    estimatedUsd: a.declared_value_usd,
    status:       a.verification_status,
    mintCostAbra: a.mint_cost_abra,
    createdAt:    new Date(a.submitted_at).getTime(),
  };
}

export function useWalletAssets() {
  const { publicKey, connected } = useWallet();
  const storeAssets              = useAbraStore(s => s.assets);
  const [dbAssets, setDbAssets]  = useState<SupabaseAsset[]>([]);
  const [loading, setLoading]    = useState(false);
  const [source,  setSource]     = useState<"supabase"|"store"|"empty">("empty");

  useEffect(() => {
    if (!connected || !publicKey) {
      setDbAssets([]);
      return;
    }

    const wallet = publicKey.toBase58();
    setLoading(true);

    fetch(`/api/assets/wallet/${wallet}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.assets?.length > 0) {
          setDbAssets(data.assets.map(mapToStoreFormat));
          setSource("supabase");
        } else {
          setSource("store");
        }
      })
      .catch(() => setSource("store"))
      .finally(() => setLoading(false));
  }, [connected, publicKey]);

  // Merge: Supabase is authoritative if available, else use Zustand
  const assets = source === "supabase" ? dbAssets : storeAssets as unknown as SupabaseAsset[];

  return { assets, loading, source };
}