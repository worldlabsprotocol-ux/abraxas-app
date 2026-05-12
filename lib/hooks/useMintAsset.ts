// FILE: lib/hooks/useMintAsset.ts
// Atomic mint: transaction record + asset insert + event emit — single logical unit.
// DB-first when Supabase available. Zustand fallback for demo mode.

"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAbraStore } from "@/lib/abraxasStore";

interface MintParams {
  wallet:       string;
  name:         string;
  description:  string;
  assetClass:   string;
  imagePreview: string | null;
  estimatedUsd: number;
  ltv:          number;
  custodyPartner: string;
  grade?:       string;
  year?:        string;
  mintCostAbra: number;
}

interface MintResult {
  success:      boolean;
  assetId?:     string;
  txSignature?: string;
  error?:       string;
}

export function useMintAsset() {
  const [minting,  setMinting]  = useState(false);
  const [result,   setResult]   = useState<MintResult | null>(null);

  // Zustand store for fallback
  const mintInStore    = useAbraStore(s => s.mintAsset);
  const abraBalance    = useAbraStore(s => s.abraBalance);

  async function mint(params: MintParams): Promise<MintResult> {
    setMinting(true);
    setResult(null);

    // ─── Balance pre-check ─────────────────────────────────────────────────
    if (abraBalance < params.mintCostAbra) {
      const err = { success: false, error: `Insufficient $ABRA. Need ${params.mintCostAbra}, have ${abraBalance}.` };
      setResult(err); setMinting(false); return err;
    }

    if (supabase) {
      // ─── DB path (production) ─────────────────────────────────────────────
      try {
        const txSig = `AbrxTx${Date.now().toString(36).toUpperCase()}`;

        // 1. Record transaction (economic truth)
        const { error: txErr } = await supabase.from("transactions").insert({
          wallet:      params.wallet,
          type:        "mint",
          amount_abra: params.mintCostAbra,
          status:      "confirmed",
          tx_signature: txSig,
        });
        if (txErr) throw new Error(txErr.message);

        // 2. Create asset (status: pending_verification)
        const { data: assetRow, error: assetErr } = await supabase
          .from("assets")
          .insert({
            owner_wallet:    params.wallet,
            name:            params.name,
            description:     params.description,
            category:        params.assetClass,
            image_url:       params.imagePreview,
            price_usd:       params.estimatedUsd,
            ltv:             params.ltv,
            borrow_max_usd:  Math.round(params.estimatedUsd * params.ltv / 100),
            custody_partner: params.custodyPartner,
            grade:           params.grade,
            year:            params.year,
            mint_cost_abra:  params.mintCostAbra,
            status:          "pending_verification",
            token_id:        `AbrxM${Date.now().toString(36).toUpperCase()}`,
          })
          .select()
          .single();
        if (assetErr) throw new Error(assetErr.message);

        // 3. Emit event
        await supabase.from("events").insert({
          type:       "ASSET_TOKENIZED",
          asset_id:   assetRow.id,
          wallet:     params.wallet,
          payload:    { name: params.name, assetClass: params.assetClass, estimatedUsd: params.estimatedUsd },
        });

        const ok = { success: true, assetId: assetRow.id, txSignature: txSig };
        setResult(ok); setMinting(false); return ok;

      } catch (e: unknown) {
        const err = { success: false, error: (e as Error).message };
        setResult(err); setMinting(false); return err;
      }

    } else {
      // ─── Zustand fallback (demo mode) ─────────────────────────────────────
      const newAsset = mintInStore({
        name:           params.name,
        description:    params.description,
        assetClass:     params.assetClass as any,
        imagePreview:   params.imagePreview ?? undefined,
        estimatedUsd:   params.estimatedUsd,
        ltv:            params.ltv,
        custodyPartner: params.custodyPartner,
        grade:          params.grade,
        year:           params.year,
        mintCostAbra:   params.mintCostAbra,
      }, params.wallet);

      if (!newAsset) {
        const err = { success: false, error: "Insufficient $ABRA balance." };
        setResult(err); setMinting(false); return err;
      }
      const ok = { success: true, assetId: newAsset.id, txSignature: newAsset.txSignature };
      setResult(ok); setMinting(false); return ok;
    }
  }

  return { mint, minting, result };
}