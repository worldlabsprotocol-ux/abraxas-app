"use client";
// FILE: components/redesign/RegistryHeroPanel.tsx
// Balanced hero — one strong Cielo image + compact asset thumb strip.

import { motion } from "framer-motion";
import Link from "next/link";
import { EXPLORE_ASSETS, VERIFY_META } from "@/lib/data/exploreAssets";
import { CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";
import { AssetThumbnail, assetThumbObjectPosition } from "@/components/ui/AssetThumbnail";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function RegistryHeroPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      style={{
        position: "relative", borderRadius: 20, overflow: "hidden",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--shadow-glow)", background: "var(--surface-raised)",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "4/3", minHeight: 280, background: "#06090B" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CIELO_HERO_IMAGE.src}
          alt={CIELO_HERO_IMAGE.alt}
          style={{
            width: "100%", height: "100%", objectFit: "cover", display: "block",
            objectPosition: CIELO_HERO_IMAGE.objectPosition,
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(6,9,11,0.96) 0%, rgba(6,9,11,0.45) 42%, rgba(6,9,11,0.12) 100%)",
        }} />

        <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{
            fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
            padding: "0.25rem 0.55rem", borderRadius: 999,
            background: "rgba(0,0,0,0.65)", color: ACCENT, border: "1px solid rgba(16,185,129,0.35)",
          }}>
            PUBLIC REGISTRY
          </span>
          <span style={{
            fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
            padding: "0.25rem 0.55rem", borderRadius: 999,
            background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
            {EXPLORE_ASSETS.length} assets · design partner phase
          </span>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1rem 1rem 1.1rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "#fff", marginBottom: "0.3rem" }}>
            Verified assets across classes
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.78)", marginBottom: "0.85rem", lineHeight: 1.5, maxWidth: 400 }}>
            Browse without ID checks. Genesis pilot shown — full registry below.
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.4rem",
            marginBottom: "0.85rem",
          }}>
            {EXPLORE_ASSETS.map(asset => {
              const meta = VERIFY_META[asset.state];
              return (
                <Link key={asset.id} href={asset.href ?? "/verify"} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.4rem 0.5rem", borderRadius: 10,
                    background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    <AssetThumbnail
                      src={asset.image}
                      alt={asset.name}
                      size={40}
                      borderRadius={8}
                      objectPosition={assetThumbObjectPosition(asset.id)}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "#fff",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {asset.name}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: "0.45rem", fontWeight: 700, color: meta.color, marginTop: 2 }}>
                        {meta.label}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Btn href="/verify" size="sm">Verify records →</Btn>
            <Btn href="/passport" variant="tertiary" size="sm">Create passport</Btn>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
