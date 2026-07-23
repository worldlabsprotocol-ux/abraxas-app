"use client";
// FILE: components/verify/VerifyAssetsShowcase.tsx
// Tokenized / registry assets on the verify page — browse → lookup.

import Link from "next/link";
import { registryAssetsForShowcase } from "@/lib/data/registryAssets";
import { VERIFY_META } from "@/lib/data/exploreAssets";
import { CmnRegistrySlideshow } from "@/components/registry/CmnRegistrySlideshow";
import {
  VERIFY_SHOWCASE_BODY,
  VERIFY_SHOWCASE_EYEBROW,
  VERIFY_SHOWCASE_HEADLINE,
} from "@/lib/institutionalRegistry";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface Props {
  onSelectAsset?: (abxId: string) => void;
}

export function VerifyAssetsShowcase({ onSelectAsset }: Props) {
  const assets = registryAssetsForShowcase();

  return (
    <section aria-labelledby="verify-assets-heading" style={{ marginBottom: "1.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: ACCENT, marginBottom: "0.35rem" }}>
            {VERIFY_SHOWCASE_EYEBROW}
          </div>
          <h2 id="verify-assets-heading" style={{ fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
            {VERIFY_SHOWCASE_HEADLINE}
          </h2>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 520, margin: "0.4rem 0 0" }}>
            {VERIFY_SHOWCASE_BODY}
          </p>
        </div>
        <Btn href="/trust-framework" variant="secondary" size="sm">Trust framework →</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "0.75rem" }}>
        {assets.map(asset => {
          const meta = VERIFY_META[asset.verifyState];
          return (
            <article
              key={asset.abxId}
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ position: "relative", height: 140, background: "#0a0f14" }}>
                {asset.abxId === "ABX-COL-PSA-007" ? (
                  <CmnRegistrySlideshow alt={asset.name} height={140} showDots={false} />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={asset.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,9,11,0.85) 0%, transparent 55%)" }} />
                <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT, fontSize: "0.55rem", fontWeight: 700, padding: "0.25rem 0.5rem", borderRadius: 999, background: "rgba(0,0,0,0.55)", color: meta.color, border: `1px solid ${meta.color}55` }}>
                    {meta.label}
                  </span>
                  {asset.statusBadge && <CapabilityStatusBadge status={asset.statusBadge} size="xs" />}
                </div>
                <div style={{ position: "absolute", bottom: 10, left: 10, right: 10 }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "#fff" }}>{asset.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.65)" }}>{asset.location}</div>
                </div>
              </div>

              <div style={{ padding: "0.85rem 0.95rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: ACCENT, fontWeight: 700 }}>{asset.abxId}</div>
                {asset.primaryLabel && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT, fontSize: "0.68rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>{asset.primaryLabel}</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{asset.primaryValue}</span>
                  </div>
                )}
                {asset.tokenization && (
                  <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {asset.tokenization.standard} · {asset.tokenization.chain} · {asset.tokenization.status}
                  </div>
                )}
                {asset.note && (
                  <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{asset.note}</p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "auto", paddingTop: "0.35rem" }}>
                  <Link
                    href={`/verify/${encodeURIComponent(asset.abxId)}`}
                    style={{
                      padding: "0.45rem 0.75rem", borderRadius: 999,
                      background: ACCENT, color: "#04130C",
                      fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Verify this asset →
                  </Link>
                  {onSelectAsset && (
                    <button
                      type="button"
                      onClick={() => onSelectAsset(asset.abxId)}
                      style={{
                        padding: "0.45rem 0.75rem", borderRadius: 999,
                        border: "1px solid var(--border-strong)", cursor: "pointer",
                        background: "transparent", color: "var(--text-secondary)",
                        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                      }}
                    >
                      Quick lookup
                    </button>
                  )}
                  {asset.href && (
                    <Link href={asset.href} style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
                      View details
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
