// FILE: app/marketplace/page.tsx
"use client";

import Link from "next/link";
import { VAULTS, fmtUSD } from "@/lib/appData";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { AbxCard, AbxStatusBadge } from "@/components/design/AbxPrimitives";
import { AbxInnerPage } from "@/components/design/AbxInnerPage";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { MotionCard } from "@/lib/motion/MotionCard";

const FONT = ABX_FONT_SANS;

export default function MarketplacePage() {
  const totalAum = fmtUSD(VAULTS.reduce((s, v) => s + v.tvl, 0));

  return (
    <AbxPageShell accent="home">
      <AbxInnerPage
        accent="home"
        eyebrow="Marketplace"
        title="Active vaults"
        lead={`${VAULTS.length} operating vaults · ${totalAum} total AUM`}
        maxWidth={980}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {VAULTS.map((v) => {
            const operating = v.status === "operating";
            return (
              <Link key={v.id} href={`/vault/${v.id}`} style={{ textDecoration: "none" }}>
                <MotionCard>
                  <AbxCard accent="home" padding="1.25rem 1.5rem">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                            {v.name}
                          </span>
                          <AbxStatusBadge label={v.status} tone={operating ? "success" : "warning"} />
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                          {v.asset} · {v.agent}
                        </div>
                        <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.74rem", flexWrap: "wrap" }}>
                          <span>
                            <span style={{ color: "var(--text-muted)" }}>TVL: </span>
                            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{fmtUSD(v.tvl)}</span>
                          </span>
                          <a
                            href={v.solscanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "var(--abx-accent)", textDecoration: "none", fontFamily: "var(--font-mono)" }}
                          >
                            {v.shortAddress} ↗
                          </a>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: "1.5rem", color: "var(--abx-accent)", letterSpacing: "-0.02em" }}>
                          {v.apy}%
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          APY
                        </div>
                      </div>
                    </div>
                  </AbxCard>
                </MotionCard>
              </Link>
            );
          })}
        </div>
      </AbxInnerPage>
    </AbxPageShell>
  );
}
