"use client";
// FILE: components/stocklana/StocklanaDemoClient.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import type { StocklanaAsset } from "@/lib/stocklana/catalog";
import {
  STOCKLANA_BRAND,
  STOCKLANA_DEMO_DISCLAIMER,
  STOCKLANA_JURISDICTION_NOTICE,
  STOCKLANA_NO_PRESTOCKS_API_NOTICE,
  STOCKLANA_VERIFICATION_SPLIT_NOTICE,
} from "@/lib/stocklana/constants";
import { stocklanaVerifyUrl } from "@/lib/stocklana/partnerIntegration";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,monospace";
const ACCENT = "#14F195";

interface MintVerifyState {
  ok: boolean;
  detail: string;
  ownerProgram: string | null;
}

export function StocklanaDemoClient() {
  const { publicKey, connected } = useWallet();
  const [assets, setAssets] = useState<StocklanaAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("openai-prestocks");
  const [mintVerify, setMintVerify] = useState<MintVerifyState | null>(null);
  const [loadingMint, setLoadingMint] = useState(false);
  const [error, setError] = useState("");

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? assets[0] ?? null,
    [assets, selectedAssetId],
  );

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/stocklana/assets");
      const data = await res.json() as { assets?: StocklanaAsset[] };
      if (data.assets?.length) {
        setAssets(data.assets);
        setSelectedAssetId(data.assets[0].id);
      }
    })();
  }, []);

  const verifyMint = useCallback(async (asset: StocklanaAsset) => {
    setLoadingMint(true);
    setError("");
    try {
      const res = await fetch(
        `/api/stocklana/assets?asset=${encodeURIComponent(asset.id)}&verify=1`,
      );
      const data = await res.json() as {
        on_chain?: MintVerifyState & { ownerProgram?: string | null };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Mint verification failed");
      setMintVerify({
        ok: Boolean(data.on_chain?.ok),
        detail: data.on_chain?.detail ?? "unknown",
        ownerProgram: data.on_chain?.ownerProgram ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mint verification failed");
      setMintVerify(null);
    } finally {
      setLoadingMint(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAsset) void verifyMint(selectedAsset);
  }, [selectedAsset, verifyMint]);

  const verifyHref = selectedAsset
    ? stocklanaVerifyUrl(typeof window !== "undefined" ? window.location.origin : undefined, selectedAsset.id)
    : "#";

  return (
    <RedesignPage accent="partner" maxWidth={920}>
      <PageHeader
        eyebrow="Stocklana × Abraxas · Hackathon demo"
        title={STOCKLANA_BRAND.name}
        subtitle={STOCKLANA_BRAND.tagline}
      />

      <ContentCard>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          {STOCKLANA_DEMO_DISCLAIMER}
        </p>
      </ContentCard>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: "1rem" }}>
        <ContentCard title="1 · Select tokenized stock">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetId(asset.id)}
                style={{
                  padding: "0.5rem 0.85rem",
                  borderRadius: 999,
                  border: `1px solid ${selectedAssetId === asset.id ? ACCENT : "var(--border)"}`,
                  background: selectedAssetId === asset.id ? `${ACCENT}18` : "var(--surface)",
                  color: selectedAssetId === asset.id ? ACCENT : "var(--text-secondary)",
                  fontFamily: FONT,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {asset.symbol}
              </button>
            ))}
          </div>
          {selectedAsset && (
            <div>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
                {selectedAsset.name}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {selectedAsset.description}
              </p>
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                mint: {selectedAsset.mint}
              </div>
              <div style={{ marginTop: "0.5rem", fontFamily: FONT, fontSize: "0.68rem" }}>
                <a href={selectedAsset.prestocksProductUrl} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>
                  PreStocks product page →
                </a>
              </div>
              {mintVerify && (
                <div style={{
                  marginTop: "0.75rem",
                  padding: "0.65rem 0.75rem",
                  borderRadius: 10,
                  border: `1px solid ${mintVerify.ok ? `${ACCENT}55` : "rgba(239,68,68,0.35)"}`,
                  background: mintVerify.ok ? `${ACCENT}10` : "rgba(239,68,68,0.08)",
                  fontFamily: MONO,
                  fontSize: "0.62rem",
                  color: "var(--text-secondary)",
                }}>
                  on-chain: {mintVerify.ok ? "Token-2022 mint verified" : mintVerify.detail}
                  {mintVerify.ownerProgram ? ` · owner ${mintVerify.ownerProgram.slice(0, 8)}…` : ""}
                  {loadingMint ? " · checking…" : ""}
                </div>
              )}
            </div>
          )}
        </ContentCard>

        <ContentCard title="2 · Connect Solana wallet">
          <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {STOCKLANA_VERIFICATION_SPLIT_NOTICE}
          </p>
          <div style={{ marginTop: "0.75rem" }}>
            <WalletMultiButton style={{ width: "100%", justifyContent: "center" }} />
          </div>
          {connected && publicKey && (
            <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT, marginTop: "0.75rem", wordBreak: "break-all" }}>
              {publicKey.toBase58()}
            </p>
          )}
        </ContentCard>
      </div>

      <div style={{ marginTop: "1rem" }}>
      <ContentCard title="3 · Request Abraxas eligibility">
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
          Abraxas hosted verification returns a signed decision receipt. Stocklana validates that receipt server-side and
          shows permitted or denied — without receiving birth dates, addresses, or document images.
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#F59E0B", lineHeight: 1.6, marginTop: "0.75rem" }}>
          {STOCKLANA_JURISDICTION_NOTICE}
        </p>
        <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn
            href={verifyHref}
            size="sm"
            disabled={!connected || !selectedAsset}
          >
            Verify eligibility with Abraxas →
          </Btn>
          <Btn href="/stocklana/callback" variant="secondary" size="sm">
            Already verified? Open callback
          </Btn>
        </div>
        {!connected && (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Connect a Solana wallet to continue (demo context only).
          </p>
        )}
      </ContentCard>
      </div>

      <ContentCard title="Data honesty">
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          {STOCKLANA_NO_PRESTOCKS_API_NOTICE}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.65, marginTop: "0.5rem" }}>
          No live trading, purchase, or token launch is enabled in this demo.{" "}
          <Link href="/docs/partner-flow" style={{ color: ACCENT }}>Partner Flow docs</Link>
        </p>
      </ContentCard>

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", marginTop: "0.75rem" }}>{error}</p>
      )}
    </RedesignPage>
  );
}
