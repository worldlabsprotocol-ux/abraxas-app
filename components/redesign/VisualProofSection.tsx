"use client";
// FILE: components/redesign/VisualProofSection.tsx
// Registry preview — compact thumbnails + metrics, balanced visual weight.

import Link from "next/link";
import { EXPLORE_ASSETS, VERIFY_META } from "@/lib/data/exploreAssets";
import { AssetThumbnail, assetThumbObjectPosition } from "@/components/ui/AssetThumbnail";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function VisualProofSection() {
  return (
    <section style={{ paddingTop: "0.75rem" }}>
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Live proof
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 560,
        }}>
          A multi-asset registry — not a single-property site
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 580, margin: "0 0 0.5rem",
        }}>
          Four asset classes at different assurance levels. One genesis pilot with supervised booking.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <CapabilityStatusBadge status="live" size="xs" />
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Public registry lookup · L1–L4 legend below registry
          </span>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "0.85rem",
      }}>
        {EXPLORE_ASSETS.map(asset => {
          const meta = VERIFY_META[asset.state];
          return (
            <Link key={asset.id} href={asset.href ?? "#registry"}
              style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{
                borderRadius: 14, padding: "0.85rem 0.95rem",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                height: "100%",
                display: "flex", gap: "0.75rem", alignItems: "flex-start",
              }}>
                <AssetThumbnail
                  src={asset.image}
                  alt={asset.name}
                  size={56}
                  objectPosition={assetThumbObjectPosition(asset.id)}
                />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem" }}>
                    <span style={{
                      fontFamily: FONT, fontSize: "0.52rem", fontWeight: 700,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: meta.color, padding: "0.12rem 0.4rem", borderRadius: 999,
                      border: `1px solid ${meta.color}44`, background: `${meta.color}12`,
                    }}>
                      {meta.label}
                    </span>
                    {asset.statusBadge && <CapabilityStatusBadge status={asset.statusBadge} size="xs" />}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {asset.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.66rem", color: "var(--text-muted)" }}>
                    {asset.location} · {asset.assetClass.split(" · ")[0]}
                  </div>
                  <div style={{
                    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT,
                    marginTop: "auto", paddingTop: "0.35rem",
                  }}>
                    {asset.primaryValue} · {asset.secondaryValue}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
        <Btn href="#registry" size="sm">Browse full registry →</Btn>
        <Btn href="/verify" variant="secondary" size="sm">Run verifier</Btn>
      </div>
    </section>
  );
}
