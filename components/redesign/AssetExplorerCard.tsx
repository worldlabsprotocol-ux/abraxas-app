"use client";
// FILE: components/redesign/AssetExplorerCard.tsx
// Premium asset card — full photo (default) or compact with small thumbnail.

import { MotionCard } from "@/lib/motion/MotionCard";
import { VerificationBadge } from "./VerificationBadge";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { Btn } from "./ui";
import { AssetThumbnail, assetThumbObjectPosition } from "@/components/ui/AssetThumbnail";
import { VERIFY_META, type ExploreAsset } from "@/lib/data/exploreAssets";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function AssetExplorerCard({
  asset,
  variant = "default",
}: {
  asset: ExploreAsset;
  variant?: "default" | "compact";
}) {
  const meta = VERIFY_META[asset.state];
  const isCompact = variant === "compact";

  return (
    <MotionCard
      glowColor={`${meta.color}33`}
      style={{
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {!isCompact ? (
        <div style={{ position: "relative", height: 220, background: "#06090B" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.image}
            alt={asset.name}
            style={{
              width: "100%", height: "100%", objectFit: "cover", display: "block",
              objectPosition: assetThumbObjectPosition(asset.id),
            }}
          />
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            <VerificationBadge label={meta.label} color={meta.color} />
            {asset.statusBadge && <CapabilityStatusBadge status={asset.statusBadge} size="xs" />}
          </div>
        </div>
      ) : (
        <div style={{
          padding: "1rem 1.1rem 0",
          display: "flex", gap: "0.85rem", alignItems: "flex-start",
        }}>
          <AssetThumbnail
            src={asset.image}
            alt={asset.name}
            size={72}
            objectPosition={assetThumbObjectPosition(asset.id)}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <VerificationBadge label={meta.label} color={meta.color} />
              {asset.statusBadge && <CapabilityStatusBadge status={asset.statusBadge} size="xs" />}
              <span style={{
                fontFamily: FONT, fontSize: "0.55rem", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--text-muted)",
              }}>
                {asset.assetClass.split(" · ")[0]}
              </span>
            </div>
            <div style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 700,
                           letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1.15 }}>
              {asset.name}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: 3 }}>
              {asset.location}
            </div>
          </div>
        </div>
      )}

      <div style={{
        padding: isCompact ? "0.85rem 1.1rem 1.05rem" : "1.05rem 1.1rem",
        display: "flex", flexDirection: "column", flex: 1,
      }}>
        {!isCompact && (
          <>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
                           letterSpacing: "0.1em", textTransform: "uppercase",
                           color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              {asset.assetClass}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 700,
                           letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1.15 }}>
              {asset.name}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: 3 }}>
              {asset.location}
            </div>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem",
                       margin: isCompact ? "0 0 0.65rem" : "0.95rem 0 0.65rem",
                       paddingTop: isCompact ? 0 : "0.85rem",
                       borderTop: isCompact ? "none" : "1px solid var(--border)" }}>
          {[
            { l: asset.primaryLabel, v: asset.primaryValue, meta: asset.primaryMeta },
            { l: asset.secondaryLabel, v: asset.secondaryValue, meta: asset.secondaryMeta },
          ].map(m => (
            <div key={m.l}>
              <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                             letterSpacing: "0.08em", textTransform: "uppercase",
                             color: "var(--text-muted)", marginBottom: 3 }}>
                {m.l}
              </div>
              <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif",
                             fontSize: "0.98rem", fontWeight: 700, letterSpacing: "-0.01em",
                             color: "var(--text-primary)" }}>
                {m.v}
              </div>
              {m.meta && (
                <div style={{ fontFamily: FONT, fontSize: "0.58rem", color: "var(--text-muted)", lineHeight: 1.45, marginTop: 4 }}>
                  {m.meta.level && <span>L{m.meta.level} · </span>}
                  {m.meta.type && <span>{m.meta.type} · </span>}
                  {m.meta.asOf && <span>as of {m.meta.asOf}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {asset.offeringDisclaimer && (
          <p style={{
            fontFamily: FONT, fontSize: "0.62rem", color: "#F59E0B",
            lineHeight: 1.5, margin: "0 0 0.65rem", padding: "0.45rem 0.55rem",
            borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)",
          }}>
            Not an offering · not investment advice · no solicitation. Figures are attestations or estimates — see verification scope.
          </p>
        )}

        {asset.verificationScopeHref && (
          <Btn href={asset.verificationScopeHref} variant="ghost" size="sm" fullWidth>
            Verification scope & disclosures →
          </Btn>
        )}

        {asset.score && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        alignSelf: "flex-start", padding: "0.2rem 0.55rem", borderRadius: 999,
                        background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.28)",
                        marginBottom: "0.65rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.6rem", fontWeight: 700,
                            color: "#10B981", letterSpacing: "0.04em" }}>
              Collateral score {asset.score}/100
            </span>
          </div>
        )}

        {asset.note && (
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
                         lineHeight: 1.5, marginBottom: "0.85rem" }}>
            {asset.note}
          </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Btn
            href={asset.href}
            newTab={!!asset.external}
            onClick={asset.href ? undefined : () => { window.location.href = "/passport"; }}
            variant={asset.state === "verified" ? "primary" : "secondary"}
            size="sm"
            fullWidth
          >
            {asset.cta} →
          </Btn>
          {asset.liveProof && (
            <Btn href={asset.liveProof.url} newTab variant="ghost" size="sm" fullWidth>
              {asset.liveProof.label} →
            </Btn>
          )}
        </div>
      </div>
    </MotionCard>
  );
}
